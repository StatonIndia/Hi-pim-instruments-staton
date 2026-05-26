const form = document.getElementById("contact-page-form");

$("#contact-page-form").submit(function(e) {

    e.preventDefault();

    const firstname = document.getElementById("cpf-firstname");
    const surname   = document.getElementById("cpf-surname");
    const email     = document.getElementById("cpf-email");
    const phone     = document.getElementById("cpf-phone");
    const message   = document.getElementById("cpf-message");

    let isValid = true;

    document.querySelectorAll(".error-text").forEach(el => el.remove());

    if (firstname.value.trim() === "") {
        showError(firstname, "First name required");
        isValid = false;
    }

    if (surname.value.trim() === "") {
        showError(surname, "Surname required");
        isValid = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email, "Enter valid email");
        isValid = false;
    }

    if (!/^[0-9]{10}$/.test(phone.value.trim())) {
        showError(phone, "Enter valid 10 digit number");
        isValid = false;
    }

    if (message.value.trim().length < 5) {
        showError(message, "Enter proper message");
        isValid = false;
    }

    if (!isValid) return;

    $("#submit-alert")
        .html("Submitting...<br>Please wait")
        .css({ "display": "block", "color": "#b85c2f", "font-weight": "900" });

    $.ajax({
        url: "https://script.google.com/macros/s/AKfycbxbdqG-kivQD8foISalO6Wz8A8rXSodpLViLshYamgPXfDfIV1NBN3WKXAx27RbLglb/exec",
        data: $("#contact-page-form").serialize(),
        method: "POST",
        success: function(response) {
            $("#submit-alert")
                .text("Form Submitted Successfully!!")
                .css({ "display": "block", "color": "#0db84a", "font-weight": "900" });

            setTimeout(function() {
                $("#contact-page-form, #submit-alert").fadeOut(800, function() {
                    $("#contact-page-form").trigger("reset").fadeIn(800);
                    $("#submit-alert").text("").fadeIn(800);
                });
            }, 5000);
        },
        error: function(err) {
            $("#submit-alert")
                .text("Something Went Wrong! Check filled details are correct and submit again, or contact us via WhatsApp or phone.")
                .css({ "display": "block", "color": "red", "font-weight": "900" });
        }
    });

});

function showError(input, msg) {
    const error = document.createElement("div");
    error.className = "error-text";
    error.style.color = "red";
    error.style.fontSize = "12px";
    error.style.marginTop = "4px";
    error.innerText = msg;
    input.parentNode.appendChild(error);
}
