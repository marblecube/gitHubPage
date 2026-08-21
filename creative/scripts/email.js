// email obfuscator

// Split the email address into parts
var username = "vidal.palacios";
var domain = "firecrackermedia";
var tld = "co";

// Construct the email address
var email = username + "@" + domain + "." + tld;

// Find the element with the ID "email" and set its text content and href attribute
var emailElement = document.getElementById("email");
emailElement.textContent = email;
emailElement.href = "mailto:" + email;

