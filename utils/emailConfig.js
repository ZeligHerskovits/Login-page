const nodemailer = require("nodemailer");


function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // false for 587 and true for 465 
    auth: {
      user: "zeligh4762@gmail.com",
      pass: "lzzh ybvi yick oyjg",
    },
  });
}

function sendEmail(transporter, mailOptions) {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
  });
}

module.exports = {
  createTransporter,
  sendEmail,
};