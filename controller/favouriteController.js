const User = require('../models/user');
// insert home into favorite model
exports.addToFavorites = async (request, response , next)=>{
    const HomeId = request.params.id;
    if(!request.session.user || !request.session.user._id){
    console.log("User not logged in");
    return response.redirect('/auth/log-in');
    }
    const userId = request.session.user._id;
    const user = await User.findById(userId);
    // console.log('user',user);
    if(!user){
        console.log("User not found");
        return response.redirect('/login');
    }
    if(user.favourite.includes(HomeId)){
        console.log("Home already in favorites:", HomeId);
        return response.redirect('/favorites');
    }
    user.favourite.push(HomeId);
    await user.save();
    console.log("Home added to favorites:", HomeId);
    response.redirect('/favorites');
}

exports.showFavorites = async (request, response, next) => {
    try {
        if(!request.session.user || !request.session.user._id){
        console.log("User not logged in");
        return response.redirect('/auth/log-in');
        }
        const userId = request.session.user._id;
        console.log("User ID for fetching favorites:", userId); // output: User ID for fetching favorites: new ObjectId('692174cbe0bbd4fa9e062e55')
        const user = await User.findById(userId).populate('favourite');
        response.render('favorites', {
            home: user.favourite,
            title: 'My Favorites',
            isLoggedIn: request.isLoggedIn,
            user: request.session.user,
        });
    } catch (err) {
        console.error("Error fetching favorites:", err);
        next(err);
    }
};


// remove favorites

exports.removeFavorites = async (request, response , next)=>{
    const removeId = request.params.id;
    if(!request.session.user || !request.session.user._id){
    console.log("User not logged in");
    return response.redirect('/auth/log-in');
    }
    const userId = request.session.user._id;
    const user = await User.findById(userId);
    console.log('user before removing favorite:',user);
    user.favourite.pull(removeId);
    await user.save();
    console.log('user after removing favorite:',user);
    response.redirect('/favorites');
}