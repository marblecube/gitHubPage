// email obfuscator

// Split the email address into parts
var username = "vidal.palacios";
var domain = "firecrackermedia";
var tld = "co";

// Construct the email address
var email = username + "@" + domain + "." + tld;

// Find the element with the ID "email" and set its text content
document.getElementById("email").textContent = email;

// Optionally, set the email address as a clickable mailto link
document.getElementById("email").href = "mailto:" + email;
