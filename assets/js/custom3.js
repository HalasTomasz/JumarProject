// =============  Data Table - (Start) ================= //

var minDate, maxDate;

// Custom filtering function which will search data in column four between two values
$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
        var min = minDate.val();
        var max = maxDate.val();
        var date = new Date( data[3] );
        console.log(date)
        if (
            ( min === null && max === null ) ||
            ( min === null && date <= max ) ||
            ( min <= date   && max === null ) ||
            ( min <= date   && date <= max )
        ) {
            return true;
        }
        return false;
    }
);

$(document).ready(function(){

    minDate = new DateTime($('#min'), {
        format: 'MMMM Do YYYY'
    });
    maxDate = new DateTime($('#max'), {
        format: 'MMMM Do YYYY'
    });

    var table = $('#example').DataTable({
        buttons:['copy', 'csv', 'excel', 'pdf', 'print'],
      scrollX: true,
        
    });
    
    
    table.buttons().container()
    .appendTo('#example_wrapper .col-md-6:eq(0)');

    $('#min, #max').on('change', function () {
        table.draw();
    });

});

// =============  Data Table - (End) ================= //

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
