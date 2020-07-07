/*!
 * Medusa Chess
 */

// Global vars

var cfg = {
    orientation: 'white',
    position: 'start',
    showNotation: false
};
var board = ChessBoard('board', cfg);
var socket = io();
var engine_color = ''

// Sockets

//socket.emit('client-to-server-data', { }); // not used

socket.on('server-to-client-board-data', function (data) {
        console.log('[DEBUG] Received board data: ' + JSON.stringify(data))
        var cfg = data
        var board = ChessBoard('board', cfg)	
});

socket.on('server-to-client-pgn-data', function (data) {
        console.log('[DEBUG] Received pgn data: ' + JSON.stringify(data))
        // style insertion
        $( "div.pgn" ).html("<p class=\'small text-primary\'>"+data+"</p>")
        $("div.pgn_frame").scrollTop($("div.pgn").height());
        // evaluation chart
        pgn_log = data
        comments_counter = (pgn_log.match(/\{/g) || []).length
        chart.data.labels = []
        chart.data.datasets[0].data = []
        if (comments_counter != 0) {
            for (i = 0; i < comments_counter; i++) {
                extracted_pgn = pgn_log.slice(pgn_log.indexOf("{")) 
                extract_evaluation = extracted_pgn.match(/\{[+-]?\d+[.]?\d*\//)[0].slice(1,-1)
                chart.data.labels.push(i+1)
                chart.data.datasets[0].data.push(extract_evaluation)
                if (extract_evaluation >= 0) {
                    chart.data.datasets[0].backgroundColor[i] = "#bac964" //"#f37121"
                } else {
                    chart.data.datasets[0].backgroundColor[i] = "#438a5e" //"#c70039"
                }
                pgn_log = extracted_pgn.slice(extracted_pgn.indexOf("}")) // let's walk over string
            }
        }	
        chart.update()
});

socket.on('server-to-client-console-data', function (data) {
        console.log('[DEBUG] Received console data: ' + JSON.stringify(data))
        // update engine's color
        i = data.lastIndexOf('engine is playing ')
        engine_color = data.slice(i+18,i+23)
        // <BR> insertion
        data = data.replace(/\n/g,'<BR>')
        // color insertion
        data = data.replace(/....-..-.. ..:..:../g, function (x) {
            return ("<span class=\'text-dark\'>" + x + "</span>");
        });
        data = data.replace(/\[DEBUG\]/g,"<span class=\'text-info\'>[DEBUG]</span>")
        data = data.replace(/\[WARNING\]/g,"<span class=\'text-warning\'>[WARNING]</span>")
        data = data.replace(/\[ERROR\]/g,"<span class=\'text-danger\'>[ERROR]</span>")
        data = data.concat("<span class=\'blinking-cursor\'>|</span>")
        // style insertion
        data = "<p class=\'small text-success\'>"+data+"</p>"
        $( "div.console" ).html(data)
        $("div.console_frame").scrollTop($("div.console").height());
});

socket.on('server-to-client-turn-data', function (data) {
        console.log('[DEBUG] Received turn data: ' + JSON.stringify(data))
        // style insertion + loading animation
        turn_color = data.slice(0,5)
        if (turn_color == engine_color) {
            $( "p.turn" ).html("<span class=\'loading dots2\'></span><span class=\'badge badge-pill badge-secondary\'>"+data+"</span><span class=\'loading dots2\'></span>")
        } else {
            $( "p.turn" ).html("</span><span class=\'badge badge-pill badge-secondary\'>"+data+"</span>")					
        }
});

socket.on('server-to-client-bottom_player-data', function (data) {
        console.log('[DEBUG] Received bottom_player data: ' + JSON.stringify(data))
        $( "span.b_player" ).html("<span class=\'font-weight-bold text-dark\'>"+data+"</span>")
});

socket.on('server-to-client-top_player-data', function (data) {
        console.log('[DEBUG] Received top_player data: ' + JSON.stringify(data))
        $( "span.t_player" ).html("<span class=\'font-weight-bold text-dark\'>"+data+"</span>")
});

// chart.js	

var ctx = document.getElementById('chart_visualization').getContext('2d');
chart_width = $("div.chart_frame").width(); 
ctx.canvas.width  = chart_width; // resize chart to width=100%
var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'bar',

    // The data for our dataset
    data: {
        labels: [],
        datasets: [{
            //label: 'Title here',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: [],
            backgroundColor: []
        }]
    },
    // Configuration options go here
    options: {
        legend: {
            display: false // do not show title
        },
        responsive: false, 
        maintainAspectRatio: false,
        scales: {
            yAxes: [{
                ticks: {
                    min: -5,
                    max: 5,
                    stepSize: 2.5,
                    beginAtZero: false
                }
            }]
        }
    }
});