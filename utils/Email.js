const nodemailer = require("nodemailer");
// const pug = require('pug');
// const htmlToText = require('html-to-text');
const handlebars = require("handlebars");
const path = require("path");
const fs = require("fs");

module.exports = class Email {
  constructor(email) {
    this.to = email;
    this.from = `TTS <help@tts-systems.de>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      host: "smtp.eu.mailgun.org",
      port: 587,
      auth: {
        user: process.env.MAILGUN_USERNAME,
        pass: process.env.MAILGUN_PASSWORD,
      },
    });
  }

  async send(sourceHtml, subject) {
    const filePath = path.join(__dirname, `./emailHtml/${sourceHtml}.html`);
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = handlebars.compile(source);
    const replacements = {
      firstname: 'Shimmy'
    };
    const html = template(replacements);
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendPlaylistNotTracking() {
    await this.send("welcome", "Problem tracking playlist 😥");
  }
};