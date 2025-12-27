const { check, validationResult } = require('express-validator');
const Contact = require('../models/contact');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

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


      await resend.emails.send({
      from: 'support@verify.nestibly.in',
      to: 'krayush.12112@gmail.com',
      reply_to: email,
      subject: `[${type.toUpperCase()}] ${subject}`,
      html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #4f46e5;">New Contact Form Submission</h2>
              <p><strong>Naam:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Category:</strong> ${type}</p>
              <hr>
              <p><strong>Message:</strong></p>
              <p style="background: #f4f4f4; padding: 10px;">${message}</p>
              <br>
              <small>Note: This data is also saved in MongoDB.</small>
          </div>
      `
          });

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
