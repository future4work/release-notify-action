// External dependencies
const sgMail = require('@sendgrid/mail'),
  showdown  = require('showdown'),
  fs = require('fs'),
  request = require("request")

// E-mail string templates
const SUBJECT_TEMPLATE = "New FUTURE $REPO$ release: $NAME$",
  FOOTER_TEMPLATE = "\n\n## Where to find the release?\n\n[Visit the release page]($RELEASEURL$)\n\n"


let setCredentials = function(){
  sgMail.setApiKey(process.env.SENDGRID_API_TOKEN)
}

let prepareMessage = function(recipients) {

  let eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
    converter = new showdown.Converter(),
    repoName = eventPayload.repository.name,
    releaseVersion = eventPayload.release.tag_name,
    releaseName = eventPayload.release.name,
    releaseURL = eventPayload.release.html_url,

    // This is not efficient but I find it quite readable
    emailSubject = SUBJECT_TEMPLATE
      .replace("$REPO$", repoName)
      .replace("$NAME$", releaseName),

    footer = FOOTER_TEMPLATE
      .replace("$RELEASEURL$", releaseURL)

    releaseBody = converter.makeHtml(eventPayload.release.body + footer)

  let msg = {
    to: ['no-reply@future.work'],
    from: {
      name: 'FUTURE DevOps',
      email: 'no-reply@future.work',
    },
    bcc: recipients,
    subject: emailSubject,
    html: releaseBody
  };

  return msg
}

sendEmails = function (msg) {

  sgMail
    .send(msg)
    .then(() => {
      console.log("Mail sent!")
    })
    .catch(error => {

      //Log friendly error
      console.error(error.toString())

      //Extract error msg
      const {message, code, response} = error

      //Extract response msg
      const {headers, body} = response
    });
}



let getRecipients = function(recipients_url, callback) {

  request.get(recipients_url, (error, response, body) => {
    if (error) {
      console.error(error)
      process.exit(1);
    }

    callback(body.split(/\r\n|\n|\r/))

  });

}

setCredentials()
getRecipients(process.env.RECIPIENTS, function(recipients) {
  sendEmails(prepareMessage(recipients))
})
