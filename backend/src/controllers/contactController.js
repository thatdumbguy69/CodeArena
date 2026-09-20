const { sendContactEmail } = require('../utils/mailer');

const handleContactSubmit = async (req, res) => {
  try {
    const { name, email, rollNo, category, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required fields.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const result = await sendContactEmail({
      name,
      email,
      rollNo,
      category,
      subject,
      message
    });

    return res.status(200).json({
      message: result.delivered
        ? 'Your message has been sent successfully! We will get back to you soon.'
        : 'Your contact form has been submitted successfully.',
      details: result
    });
  } catch (err) {
    console.error('Contact Form Submission Error:', err);
    return res.status(500).json({
      message: 'Failed to send message via SMTP server. Please try again later or verify SMTP settings.',
      error: err.message
    });
  }
};

module.exports = {
  handleContactSubmit
};
