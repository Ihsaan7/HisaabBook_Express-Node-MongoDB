require('dotenv').config();

const express = require("express");
const app = express();
const dbConnect = require("./config/db");
const userModel = require("./models/user");
const hisaabModel = require("./models/hisaab");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// Middleware
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", __dirname + "/views"); // Explicitly set views directory for Vercel
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public')); // Serve static files from public directory with absolute path
// Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

// DB Connection
dbConnect.then(() => {
  console.log("DB connection confirmed in app.js");
});

// 🔐 JWT Auth Middleware
function requireLogin(req, res, next) {
  const token = req.cookies.authToken;
  
  if (!token) {
    return res.redirect("/login");
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.clearCookie('authToken');
    return res.redirect("/login");
  }
}

// 🔐 Ownership Middleware
async function checkOwnership(req, res, next) {
  try {
    const hId = req.params.hId || req.params.uId; // Handle both :hId and :uId params
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(hId)) {
      return res.status(400).send("Invalid Hisaab ID");
    }
    
    const hisaab = await hisaabModel.findById(hId);
    if (!hisaab) {
      return res.status(404).send("Hisaab not found");
    }
    
    // Compare MongoDB _id from JWT with hisaab.user field
    if (hisaab.user.toString() !== req.userId.toString()) {
      return res.status(403).send("Access denied. You can only modify your own hisaabs.");
    }
    
    next();
  } catch (err) {
    console.error('Ownership check error:', err);
    res.status(500).send("Server error");
  }
}

// Routes

app.get("/", async (req, res) => {
  try {
    // Check if user is logged in via JWT
    const token = req.cookies.authToken;
    let isLoggedIn = false;
    let userUId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        isLoggedIn = true;
        // Get the user's custom uId from database
        const user = await userModel.findById(decoded.userId);
        if (user) {
          userUId = user.uId;
        }
      } catch (err) {
        // Invalid token, clear it
        res.clearCookie('authToken');
      }
    }
    
    res.render("main", { isLoggedIn, userId: userUId });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie('authToken'); // Clear JWT cookie
  res.redirect("/");
});

// SignUp
app.get("/signUp", (req, res) => {
  try {
    res.render("signUp");
  } catch (err) {
    console.log(err);
  }
});

app.post("/signUp", async (req, res) => {
  const { username, email, password } = req.body;
  const now = new Date();
  const nameDate = now.toISOString().slice(0, 10);
  const idDate = now.getTime();

  try {
    // Hash password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const userAcc = await userModel.create({ 
      username, 
      email, 
      password: hashedPassword, 
      uId: idDate, 
      dateCreated: nameDate 
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userAcc._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set JWT as HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.redirect("/"); // Redirect to main route
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating account");
  }
});

// Login
app.get("/login", (req, res) => {
  try {
    res.render("login");
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await userModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not Found (Create Account if new!)" });
    }

    console.log('Login attempt for user:', username);
    console.log('Password from form:', password);
    console.log('Stored password hash:', user.password);
    console.log('Is stored password a hash?', user.password.startsWith('$2b$'));

    let isPasswordValid = false;
    
    // Check if password is already hashed (starts with $2b$ for bcrypt)
    if (user.password.startsWith('$2b$')) {
      // Password is properly hashed, use bcrypt.compare
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Bcrypt comparison result:', isPasswordValid);
    } else {
      // Legacy plain text password - compare directly and then update to hashed
      if (password === user.password) {
        isPasswordValid = true;
        console.log('Plain text password matched - will update to hashed');
        
        // Update to hashed password for security
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await userModel.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log('Password updated to hashed version');
      }
    }
    
    if (!isPasswordValid) {
      console.log('Password validation failed');
      return res.status(401).json({ message: "Invalid Credentials" });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set JWT as HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.redirect("/"); // Redirect to main route after login

  } catch (err) {
    console.log(err);
    res.status(500).send("Login error");
  }
});

// Create Hisaab GET (Protected) - Show create form
app.get("/create/:uId", requireLogin, async (req, res) => {
  const userId = req.params.uId;
  
  try {
    // Verify user exists and session matches
    const user = await userModel.findOne({ uId: userId });
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    res.render("createUser", { userId });
  } catch (err) {
    console.error("Error loading create form:", err);
    res.status(500).send("Server error");
  }
});

// Create Hisaab POST (Protected) - Handle form submission
app.post("/create/:uId", requireLogin, async (req, res) => {
  const userUid = req.params.uId;
  const { title, hisaab, encrypt, secretCode, shareable, editable } = req.body;
  
  const now = new Date();
  const nameDate = now.toISOString().slice(0, 10);
  const idDate = now.getTime().toString();

  try {
    // Get user from JWT to verify ownership
    const jwtUser = await userModel.findById(req.userId);
    if (!jwtUser || jwtUser.uId !== userUid) {
      return res.status(403).send("Unauthorized access");
    }

    const hisaabData = await hisaabModel.create({
      data: hisaab,
      topic: title,
      nameDate,
      idDate,
      userId: userUid,
      encrypt: encrypt ? true : false,
      secretCode: encrypt ? secretCode : "",
      isShare: shareable ? true : false,
      editPerms: editable ? true : false,
      user: req.userId
    });

    res.redirect(`/show/${userUid}`);
  } catch (err) {
    console.log("Error creating Hisaab:", err);
    res.status(500).send("Failed to create Hisaab");
  }
});


//      showHisaab Route
app.get("/show/:uId", requireLogin ,async (req,res)=>
    {
        const userId = req.params.uId;
        const userData =await hisaabModel.find({ userId: userId })

        try
        {
            res.render("showHisaab" , {userId , userData})
        }catch(err)
        {
            console.log(err)
        }

    });

app.get("/showDetail/:uId", async (req, res) => {
  const hId = req.params.uId;
  const flag = req.query.flag; // Get flag from query parameter
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(hId)) {
    return res.status(400).send("Invalid Hisaab ID. Please use a valid link.");
  }
  try {
    const hisaabId = await hisaabModel.findById(hId);
    if (!hisaabId) {
      return res.status(404).send("Hisaab not found");
    }
    // Pass the user's uId (from the hisaab record) for navbar links
    const userUId = hisaabId.userId;
    
    // Check if current user is the owner by comparing MongoDB _id with hisaab.user field
    const isOwner = req.session.userId && req.session.userId.toString() === hisaabId.user.toString();
    
    res.render("hisaabDetail", { hisaabId, hId, flag, userUId, isOwner }); // Pass isOwner flag to template
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/showDetail/:uId", async (req, res) => {
  const hId = req.params.uId;
  const secretCode = req.body.encPass;
  
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(hId)) {
    return res.status(400).send("Invalid Hisaab ID. Please use a valid link.");
  }
  
  try {
    const hisaabData = await hisaabModel.findById(hId);
    if (!hisaabData) {
      return res.status(404).send("Record not found");
    }
    
    const secretCodeDB = hisaabData.secretCode;
    const flag = secretCode === secretCodeDB ? '1' : '0';
    
    res.redirect(`/showDetail/${hId}?flag=${flag}`);
  } catch (err) {
    console.error('Error in password verification:', err);
    res.status(500).send("Server error");
  }
});

//      Delete Routes
app.get("/delete/:hId", requireLogin, checkOwnership, async (req,res)=>
  {
    const hId = req.params.hId;
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(hId)) {
      return res.status(400).send("Invalid Hisaab ID");
    }
    
    try {
      // First get the hisaab to find the user ID
      const hisaab = await hisaabModel.findById(hId);
      if (!hisaab) {
        return res.status(404).send("Hisaab not found");
      }
      
      const userUId = hisaab.userId;
      await hisaabModel.findByIdAndDelete(hId);
      res.redirect(`/show/${userUId}`);
    } catch (err) {
      console.error('Error deleting hisaab:', err);
      res.status(500).send("Error deleting hisaab");
    }
  });

  app.get("/update/:uId",requireLogin, checkOwnership, async (req,res)=>
    {
      const hId = req.params.uId;
      const mongoose = require('mongoose');
      
      if (!mongoose.Types.ObjectId.isValid(hId)) {
        return res.status(400).send("Invalid Hisaab ID");
      }
      
      try {
        const hisaabData = await hisaabModel.findById(hId);
        if (!hisaabData) {
          return res.status(404).send("Hisaab not found");
        }
        res.render("updateHisaab",{hisaabData});
      } catch (err) {
        console.error('Error loading update form:', err);
        res.status(500).send("Error loading update form");
      }
    });

  app.post("/update/:uId", requireLogin, checkOwnership, async (req, res) => {
    const hId = req.params.uId;
    const { title, hisaab, encrypt, secretCode, shareable, editable } = req.body;
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(hId)) {
      return res.status(400).send("Invalid Hisaab ID");
    }
    
    try {
      const existingHisaab = await hisaabModel.findById(hId);
      if (!existingHisaab) {
        return res.status(404).send("Hisaab not found");
      }
      
      // Update the hisaab
      await hisaabModel.findByIdAndUpdate(hId, {
        data: hisaab,
        topic: title,
        encrypt: encrypt ? true : false,
        secretCode: encrypt ? secretCode : "",
        isShare: shareable ? true : false,
        editPerms: editable ? true : false
      });
      
      res.redirect(`/show/${existingHisaab.userId}`);
    } catch (err) {
      console.error('Error updating hisaab:', err);
      res.status(500).send("Error updating hisaab");
    }
  });
// Server
const PORT = process.env.PORT || 8000;

// Only start the server if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;





