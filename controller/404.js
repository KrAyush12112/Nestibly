exports.Errorcontroller = (request, response, next) => {
    response.status(404).render(
        '404',
        {
            title: "Page Not Found",
            isLoggedIn: request.isLoggedIn,
            user: request.session.user
        }
    )
}