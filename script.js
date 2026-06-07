let menuIcon = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menuIcon.onclick = () => {
    menuIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
};

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

function openPopup(media, title, description, tools){

    const popup = document.getElementById("projectPopup");

    const popupImg = document.getElementById("popup-img");
    const popupVideo = document.getElementById("popup-video");

    document.getElementById("popup-title").innerText = title;

    document.getElementById("popup-description").innerText = description;

    document.getElementById("popup-tools").innerText = tools;

    // VIDEO
    if(media.endsWith(".mp4")){

        popupImg.style.display = "none";

        popupVideo.style.display = "block";

        popupVideo.src = media;

        popupVideo.load();

        popupVideo.play();

    }

    // IMAGE
    else{

        popupVideo.pause();

        popupVideo.style.display = "none";

        popupImg.style.display = "block";

        popupImg.src = media;
    }

    popup.style.display = "flex";
}

function closePopup(){

    const popup = document.getElementById("projectPopup");

    const popupVideo = document.getElementById("popup-video");

    popup.style.display = "none";

    popupVideo.pause();
}

const homeVideo = document.querySelector('.home-video');

homeVideo.addEventListener('mouseenter', () => {
    homeVideo.play();
});

homeVideo.addEventListener('mouseleave', () => {
    homeVideo.pause();
    homeVideo.currentTime = 0;
});

const hiddenElements = document.querySelectorAll('.hidden');

window.addEventListener('scroll', () => {

    hiddenElements.forEach(el => {

        const rect = el.getBoundingClientRect();

        if(rect.top < window.innerHeight - 100){

            el.classList.add('show');
        }
    });
});