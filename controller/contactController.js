const { check, validationResult } = require('express-validator');
const Contact = require('../models/contact');

exports.getContact = (req, res, next) => {
  res.render('contact', {
    title: 'Contact Us',
    isLoggedIn: req.session.isLoggedIn || false,
    user: req.session.user,
    errorMessages: [],
    formData: {}
  });
};

exports.postContact = [
  check('name').trim().isLength({ min: 2 }).withMessage('Please enter your name.'),
  check('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  check('type').isIn(['complaint', 'suggestion']).withMessage('Select complaint or suggestion.'),
  check('message').trim().isLength({ min: 5 }).withMessage('Message must be at least 5 characters.'),

  async (req, res, next) => {
    const errors = validationResult(req);
    const { name, email, type, subject, message } = req.body;
    if (!errors.isEmpty()) {
      return res.status(422).render('contact', {
        title: 'Contact Us',
        isLoggedIn: req.session.isLoggedIn || false,
        user: req.session.user,
        errorMessages: errors.array().map(e => e.msg),
        formData: { name, email, type, subject, message }
      });
    }

    try {
      const contact = new Contact({ name, email, type, subject, message });
      await contact.save();
      // Optionally: send notification to admin email here
      res.render('contact', {
        title: 'Contact Us',
        isLoggedIn: req.session.isLoggedIn || false,
        user: req.session.user,
        successMessage: 'Thank you — your message has been received.',
        errorMessages: [],
        formData: {}
      });
    } catch (err) {
      console.error('Error saving contact message:', err);
      res.status(500).render('contact', {
        title: 'Contact Us',
        isLoggedIn: req.session.isLoggedIn || false,
        user: req.session.user,
        errorMessages: ['Something went wrong. Please try again later.'],
        formData: { name, email, type, subject, message }
      });
    }
  }
];
