
var global_id = NaN
function showPopup(id) {
    // Show the popup
    console.log(id)
    $(".popup").show();
    // Set the selected object ID
    global_id = id
}

function hidePopup() {
    // Hide the popup
    $(".popup").hide();
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