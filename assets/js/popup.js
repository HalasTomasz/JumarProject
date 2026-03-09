
var global_id = NaN
function showPopup(id) {
    // Show the popup
    $(".popup").show();
    // Set the selected object ID
    global_id = id
}

function hidePopup() {
    // Hide the popup
    $(".popup").hide();
}

function copyFormURL() {
        // Get the URL with global_id

        // Split the string by "/"
        var parts = global_id.split("/");

        // Extract the second part and convert it to a number
        var secondPart = parseInt(parts[1]);

        // Add 1 to the second part
        secondPart += 1;
          var url = "/copyForm/" + secondPart;
          window.location.href = url;

    }

function updateStatus() {
    // Get the selected object ID and status value

    var status = $("#id_Status").val();
    // Update the object status in the database
    $.ajax({
        url: "/update_status",
        method: "POST",
        data: {
            "id": global_id,
            "status": status,
            "csrfmiddlewaretoken": "{{ csrf_token }}"
        },
        success: function(data) {
            // Hide the popup and refresh the page
            hidePopup();
            window.location.reload();
        },
        error: function(xhr, status, error) {
            // Handle error
            alert("Error updating status.");
        }
    });
}