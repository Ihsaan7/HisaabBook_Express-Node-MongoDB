const express = require("express")
const app = express()
const dbConnect = require("./config/db")
const userModel = require("./models/user");


app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))


// ----------- Checking DB Connection -----------
dbConnect.then(() => {
  console.log("DB connection confirmed in app.js");
});



//-------------- ROUTES ---------------------

//          Testing Route
app.get("/test-model", (req, res) => {
  console.log("Model keys:", Object.keys(userModel));
  res.send("Check console for model methods");
});


//      Root Route
app.get("/",(req, res)=>
    {
        res.send("Working")
        console.log("userModel type:", typeof userModel);
        console.log("userModel keys:", Object.keys(userModel));

    })

//      Create user Data Route
app.get("/create",async (req,res)=>
    {
        try
        {
            const newUser = await userModel.create(
                {
                    username:"Ahmed Ali",
                    email:"AhmedAli@mail.com",
                    password:"12345"
                })
            console.log("User Created")
            res.send("User Successfully Created")
        }catch(err)
        {
            console.log(err)
        }
    })
app.get("/create-manually",(req,res)=>
    {
        try
        {
            res.render("createUser")
        }catch(err)
        {
            console.log(err)
        }
    })
app.post("/create-manually",(req,res)=>
    {
        const {username, email,password} = req.body;
        try
        {
            userModel.create(
                {
                    username,
                    email,
                    password
                })
            console.log("User Created.")
            res.redirect("/showAll")
        }catch(err)
        {
            console.log(err)
        }
    })


//      Show the User's Data Route
app.get("/show", async (req,res)=>
    {
        try
        {
            const userData = await userModel.find()
            res.render("main",{userData})

        }
        catch(err)
        {
            console.log(err)
        }
    })
app.get("/showAll",async (req,res)=>
    {
        try
        {   
            const userData =await userModel.find();
            res.render("showUser",{userData})
        }catch(err)
        {
            console.log(err)
        }
    })


// app.post("/show", async (req, res) => {
//   const { username, email, password } = req.body;

//   try {
//     const userData = await userModel.create({
//       username,
//       email,
//       password
//     });

//     console.log("User Created");
//     res.render("showUser",{userData});
//   } catch (err) {
//     console.error("Error creating user:", err);
//     res.status(500).send("Failed to create user");
//   }
// });

 




//------------ Port Listen ------------------ 
app.listen(8000,()=>
    {
        console.log("Server is running..")
    })