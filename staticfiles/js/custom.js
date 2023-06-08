// =============  Data Table - (Start) ================= //

var minDate, maxDate;

// Custom filtering function which will search data in column four between two values
$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
        var min = minDate.val();
        var max = maxDate.val();
        var date = new Date( data[4] );

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
        
        buttons:['copy',  'excel', 'print'],
        footerCallback: function (row, data, start, end, display) {
        var api = this.api();

        // Remove the formatting to get integer data for summation
        var intVal = function (i) {
          return typeof i === 'string' ? i.replace(/[\$,]/g, '') * 1 : typeof i === 'number' ? i : 0;
        };

        // Total over all pages
        total = api
          .column(4)
          .data()
          .reduce(function (a, b) {
            return intVal(a) + intVal(b);
          }, 0);

        total2 = api
          .column(5)
          .data()
          .reduce(function (a, b) {
            return intVal(a) + intVal(b);
          }, 0);

        // Total over this page
        pageTotal = api
          .column(13, { page: 'current' })
          .data()
          .reduce(function (a, b) {
            return intVal(a) + intVal(b);
          }, 0);

        pageTotal2 = api
          .column(14, { page: 'current' })
          .data()
          .reduce(function (a, b) {
            return intVal(a) + intVal(b);
          }, 0);

        // Update footer
        // $(api.column(15).footer()).html('$' + pageTotal);
        // $(api.column(16).footer()).html('$' + pageTotal2);

        // Update total data
        $('#total-data').html('DługRolkaProd:  ' + pageTotal + '   |   WagaRolkaProd:  ' + pageTotal2);
      },
      scrollX: true,
        
    });
    
    
    table.buttons().container()
    .appendTo('#example_wrapper .col-md-6:eq(0)');

    $('#min, #max').on('change', function () {
        table.draw();
    });
    $('#reset-filter').on('click', function() {
    // Clear the input fields
    minDate.val('');
    maxDate.val('');

    // Redraw the table to remove the applied filtering
    table.draw();
  });

});

// =============  Data Table - (End) ================= //
