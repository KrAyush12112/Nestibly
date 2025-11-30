
const Database = require('../models/database'); // import home model
const fs = require('fs').promises;
const path = require('path');


// get request handler for /host/add-home
exports.addHomeForm =(request, response , next)=>{
    response.render('addhome',{
        editing: false, // <-- Naya Flag: Add Mode
        home: {},
        title:"Add Home",      // <-- Home object khaali hai
        isLoggedIn: request.isLoggedIn,
        user: request.session.user
    });
};

// post request handler for /host/add-home When user posts new home.
// exports.postAddHomeController = (request, response, next)=>{
//     // Save a web-accessible path (absolute to the site root) instead of the raw filesystem path.
//     // Multer provides `request.file.filename` and we serve the uploads folder at `/uploads`.
//     if (!request.files || request.files.length === 0) {
//     return response.status(400).send('No file uploaded.');
// }

//     console.log("request.files =", request.files);
//     // const imgPath = '/uploads/' + request.file.filename;
//     const imgPath = request.files.map(file => '/uploads/' + file.filename);
//     const userId = request.session.user._id;
//     const {title, location, price, description, maxGuests} = request.body;
//     const data = new Database({title, location, price, image: imgPath, description, maxGuests, user: userId}); 
//     data.save().then(()=>{
//         console.log("Home saved successfully!")
//     })
//     response.render(
//         'Thankyou',
//          {
//         title:"Thank You",
//         isLoggedIn: request.isLoggedIn,
//         user: request.session.user
//     }
    
//     );
// }



const { uploadToS3 } = require('../utils/multerUtils');

exports.postAddHomeController = async (req, res) => {
  try {
    console.log("Files uploaded:", req.files);
    if (!req.session.user) return res.redirect('/auth/login');

    if (!req.files || req.files.length === 0) {
      return res.status(400).send('Please upload at least one image.');
    }

    // Upload each file to S3 and get URLs
    const imagePaths = [];
    for (const file of req.files) {
      const url = await uploadToS3(file.buffer, file.originalname);
      imagePaths.push(url);
    }

    const { title, location, price, description, maxGuests } = req.body;

    const data = new Database({
      title,
      location,
      price,
      image: imagePaths,
      description,
      maxGuests,
      user: req.session.user._id
    });

    await data.save();
    console.log('Home saved successfully!');

    res.render('Thankyou', {
      title: 'Thank You',
      isLoggedIn: req.isLoggedIn,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error saving home:', err);
    res.status(500).send('An error occurred while adding the home.');
  }
};




// get request handler for /host/Manage-Homes
// when host want to manage homes.
exports.manageHomes = (request, response, next)=>{
    const userId = request.session.user._id;
    Database.find({ user: userId }).then(
        (registeredHomes)=>{
        console.log(registeredHomes)
        response.render('Manage-Homes', {
            addedHomes: registeredHomes,
            title:"Manage Homes",
            isLoggedIn: request.isLoggedIn,
            user: request.session.user
        });
        }
    )
}

//
// get request handler for /host/home-edit/:id for ui
// Show edit form 
exports.updateForm = (request, response, next)=>{
    const editId = request.params.id;
    Database.findById(editId).then(
        (homeFound) =>{
            console.log("home found for edit:", homeFound);
            // authorize: only owner can edit
            const userId = request.session.user && request.session.user._id;
            
            if(!userId || homeFound.user.toString() !== userId.toString()){
                console.log('Unauthorized edit attempt by user:', userId);
                response.status(403).render('403');
            }
            response.render("addhome",{
                homeFound,
                editing: true,
                title:"Update Home",
                isLoggedIn: request.isLoggedIn,
                user: request.session.user
            })
    } )
}

// post request handler for /host/home-edit When user update in home.
exports.updateHome = async (request, response, next) => {
    try {
        const { id, title, location, price, description, maxGuests } = request.body;
        // Load existing home so we can keep its image if no new file was uploaded
        const home = await Database.findById(id);
        if (!home) {
            console.log("Home not found for id:", id);
            return response.redirect("/host/Manage-Homes");
        }

        // authorize: only owner can update
        const userId = request.session.user && request.session.user._id;
        if(!userId || home.user.toString() !== userId.toString()){
            console.log('Unauthorized update attempt by user:', userId);
            return response.status(403).render('403');

        }

        // Use uploaded file if present, otherwise keep existing image path
        const imgPath = request.file ? '/uploads/' + request.file.filename : home.image;
        if (request.file) {
            try{
                await fs.unlink(path.join(__dirname, "..", home.image));
                console.log("old file deleted");
            }catch(err){
                console.log('Old file delete failed or file not found:', err.message);
            }
        } else {
            console.log("No new file uploaded, keeping existing image:", home.image);
        }
        // Update fields and save (this runs validators defined on the schema)
        home.title = title;
        home.location = location;
        home.price = price;
        home.description = description;
        home.image = imgPath;
        home.maxGuests = maxGuests;

        await home.save();
        console.log("Home updated successfully:", home);
        return response.redirect("/host/Manage-Homes");
    } catch (err) {
        console.error("Error updating home:", err);
        return response.redirect("/host/Manage-Homes");
    }
};

// get request handler for /delete to delete home from list
exports.deleteHome = async (request, response, next)=>{
    const removeId = request.params.id;
    const userId = request.session.user && request.session.user._id;
    try{
        const home = await Database.findById(removeId);
        if(!home){
            console.log('Home to delete not found:', removeId);
            return response.redirect('/host/Manage-Homes');
        }
        if(!userId || home.user.toString() !== userId.toString()){
            console.log('Unauthorized delete attempt by user:', userId);
            return response.status(403).render('403');
        }

        const result = await Database.deleteOne({_id: removeId, user: userId});
        console.log("Delete result:", result);
        if(result.deletedCount>0){
            // try to remove uploaded file
            try{
                await fs.unlink(path.join(__dirname, "..", home.image));
            }catch(err){
                console.log('Failed to delete image file:', err.message);
            }
            return response.redirect('/host/Manage-Homes');
        }else{
            console.log('Sorry! Unable to delete');
            return response.redirect('/host/Manage-Homes');
        }
    }catch(err){
        console.error('Error deleting home:', err);
        return response.redirect('/host/Manage-Homes');
    }
}







