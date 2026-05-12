let menuIcon = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menuIcon.onclick = () => {
    menuIcon.classList.toggle('bx-x')
    navbar.classList.toggle('active');
}

emailjs.init("HT525Uc5AYVBrzPtf");

document
.getElementById("contact-form")
.addEventListener("submit", function(e){
    e.preventDefault();

    emailjs.sendForm("service_j0sqsld","template_ey786vf",this)

    .then(() => {
        alert("Message sent successfully!");
    }) 
    .catch((error) =>{
        console.error("Failed to send message:", error);
        alert("Failed to send message.");
    });
});