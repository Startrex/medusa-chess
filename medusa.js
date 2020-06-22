// Medusa Chess: a free Node.js interface tool for Bluetooth electronic boards and chess engines powered by the UCI (Universal Chess Interface) protocol
// Development and testing: Square Off Kingdom Set board and Leela Chess Zero/Stockfish
// License: MIT - Copyright 2019 zandora
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const program = require('commander')
const fs = require('fs')
const ini = require('ini')
const noble = require('noble')
const Engine = require('node-uci').Engine
const Chess = require('chess.js').Chess
const readline = require('readline')
const play = require('audio-play')
const load = require('audio-loader')
const express = require('express')
const app = express()
const router = express.Router()
const http = require('http').Server(app)
const io = require('socket.io')(http)

var chess = new Chess()
var pgn_file = ''
var connected = false

program
  .version('1.6.0')
  .option('-s, --save', 'Save games as pgn files')
  .option('-v, --voice', 'Activate engine voice')
  .option('-c, --voice-score', 'Activate engine voice with score information')
  .option('-w, --web', 'Enable realtime webpage')
  .option('-d, --debug', 'Debug (developers only)')
  .parse(process.argv)

console.log('Welcome to Medusa Chess')

console.log('Waiting for bluetooth device to get ready...')

// Bluetooth

// Bluetooth smart chess board currently supported: Square Off
const SERVICE_UUID = ["6e400001b5a3f393e0a9e50e24dcca9e"]; // this is the service UUID
const CHARACTERISTIC_UUID = ["6e400001b5a3f393e0a9e50e24dcca9e"]; // this is the characteristic UUID

noble.on('stateChange', function(state) {
	// Once the BLE radio has been powered on, it's possible to begin scanning for services
	if (state === 'poweredOn') {
	  	console.log('Starting bluetooth connection...')
	  	noble.startScanning(SERVICE_UUID, false);
	}
})

noble.on('discover', function(board) {
	if (connected == true) { console.log('Reconnecting') }
	board.connect(function(err) { // Once the board has been discovered, now connect to it
		board.discoverServices(SERVICE_UUID, function(err, services) {	
			service = services[0]
			service.discoverCharacteristics([], function(err, characteristics) {
				characteristic_WWR = characteristics[0] // properties: ['writeWithoutResponse']; used to send messages to the board
				characteristic_N = characteristics[1] // properties: ['notify']; used to receive messages back from the board
				main()
			})
		})
	})
})

async function main() {
	connected = true
	try {
		console.log('Connected to board')
		noble.startScanning(SERVICE_UUID, false); // In case board is switched off and on, medusa is able to reconnect
		characteristic_N.on('data', async function(data) { // Notification from board is received
			var board_received = data.toString('utf8').trim()
			if (program.debug) { console.log('[debug] ' + board_received+' received from board') }
			if (board_received == 'e1e1') { // new game as white 
				sendBoard('RSTVAR')
				sendBoard('GAMEWHITE')
				chess.reset()
				pgnReset(true) // player is white
				console.log('Human asked to play white, engine is playing black')
				human_colour = 'white'
				playText("ok")
				setTimeout(() => { playText("I-play-black") }, 1000); 
				setTimeout(() => { playText("good-luck") }, 2250); 
				webBoardUpdate({ orientation: 'white',position: 'start',showNotation: false })
				webPGNUpdate('')
				webTurnUpdate('black to play')
				move_info_array = []
			} else if (board_received == 'e8e8') { // new game as black
				sendBoard('RSTVAR')
				sendBoard('GAMEBLACK')
				chess.reset()
				pgnReset(false) // player is black
				console.log('Human asked to play black, engine is playing white')
				human_colour = 'black'
				playText("ok")
				setTimeout(() => { playText("I-play-white") }, 1000); 
				setTimeout(() => { playText("good-luck") }, 2250); 
				webBoardUpdate({ orientation: 'black',position: 'start',showNotation: false })
				webPGNUpdate('')
				webTurnUpdate('white to play')
				move_info_array = []
				await engine.position(chess.fen())
				engineTurn()
			} else if ((board_received == 'a1a1') || (board_received == 'a8a8')) { // toggle voice score information on/off
				sendBoard('INVALID')
				if (voiceScore == 1) {
					voiceScore = 0
					console.log('Vocal score information switched off')
					playText('score-off')
				} else if (voiceScore == 0) {
					voiceScore = 1
					console.log('Vocal score information switched on')
					playText('score-on')
				}
			} else if ((board_received == 'b1b1') || (board_received == 'b8b8')) { // ask for hint
				sendBoard('INVALID')
				console.log('Asking for hint...')
				await engine.position(chess.fen()) // update position for engine
				var result = await engine.go(go)
				move['from'] = result.bestmove.substr(0,2)
				move['to'] = result.bestmove.substr(2,2)
				var temp_san = chess.move(move)['san']
				console.log('Hint: ' + temp_san) 
				if (program.voice || program.voiceScore) { 
					playText("hint")
					playMove(temp_san, 1000)
				}
				chess.undo()
			} else {
				moves['square'] = board_received.substr(0,2) // valid move?
				legal_moves = chess.moves(moves).toString()
				if (legal_moves.includes('O-O') && (human_colour == 'black')) { legal_moves = legal_moves.replace('O-O','Kg8')	}
				if (legal_moves.includes('O-O-O') && (human_colour == 'black')) { legal_moves = legal_moves.replace('O-O-O','Kc8')	}
				if (legal_moves.includes('O-O') && (human_colour == 'white')) { legal_moves = legal_moves.replace('O-O','Kg1')	}
				if (legal_moves.includes('O-O-O') && (human_colour == 'white')) { legal_moves = legal_moves.replace('O-O-O','Kc1')	}
				//if (program.debug) { console.log('[debug] Legal moves for clicked square: '+legal_moves) } // not necessary anymore...
				if (legal_moves.indexOf(board_received.substr(2,2).toString()) == -1) {
					sendBoard('INVALID')
				} else {
					sendBoard('OK')
					// log move
					move['from'] = board_received.substr(0,2)
					move['to'] = board_received.substr(2,2)						
					if ((chess.get(move['from']).type == 'p') && (board_received.substr(2,2).substr(1,1) == '8')) { //promotion
						const ans = await askQuestion("Enter promotion piece [q|b|k|r]: ");
						playText("enter-promotion")
						if ((ans.toLowerCase() != 'b') && (ans.toLowerCase() != 'k') && (ans.toLowerCase() != 'r')) ans = 'q'
						move['promotion'] = ans.toLowerCase()
					}				
					var san = chess.move(move)['san']
					if (chess.history().length == 1 ) { // first move
						pgn_file = getDateTime()+'.pgn'
					}
					if ((human_colour == 'white') && (chess.in_checkmate())) { chess.header('Result', '1-0') }
					if ((human_colour == 'black') && (chess.in_checkmate())) { chess.header('Result', '0-1') }
					if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) { chess.header('Result', '1/2-1/2') }
					var chess_pgn = getChessPGN()					
					pgnSave(pgn_file, chess_pgn)
					webPGNUpdate(chess_pgn)
					if (human_colour == 'white') { webBoardUpdate({ orientation: 'white',position: chess.fen(),showNotation: false }) } else { webBoardUpdate({ orientation: 'black',position: chess.fen(),showNotation: false }) }
					console.log('Human played ' + san)
					if (chess.in_checkmate() || chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) { // end of game
						EOG_messages()
						sendBoard('RSTVAR')
						if (human_colour == 'white') { sendBoard('GAMEWHITE') } else { sendBoard('GAMEBLACK') }
						console.log('Choose colours by clicking twice on your king\'s initial square to start a new game.')
						if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) { playText("draw") }  else { playText("congratulations") }
						setTimeout(() => { playText("choose-colours") }, 1750); 
						chess.reset()
						if (human_colour == 'white') { pgnReset(true) } else { pgnReset(false) }
						webTurnUpdate('')
					} else {
						if (human_colour == 'white') { webTurnUpdate('black to play') } else { webTurnUpdate('white to play') }
						await engine.position(chess.fen()) // update position for engine
						engineTurn()
					}
				}
			}
		})
		
		characteristic_N.notify(true, function(error) { } ) // activates notification
		
		// Initialization after blueetooth is ready / board is connected
		sendBoard('CONNECTED')
		sendBoard('RSTVAR')
		sendBoard('GAMEWHITE') // we always start as white		
		console.log('Board ready')
		chess.reset()
		var human_colour = 'white'
		var move = {}
		var moves = {}
		var move_info_array = []
		var engine_description = ''
		var engine_elo = '?'

		//UCI
		file = 'medusa.config'
		console.log('Checking '+file+'...')
		var config = ini.parse(fs.readFileSync('./'+file, 'utf-8'))
		console.log('Using path = '+config.engine['path']) // parse engine path
		if (typeof config.engine.description !== 'undefined') {                         
			console.log('Loading engine information description = '+config.engine.description)                         
			engine_description = config.engine.description                 
		}
		if (typeof config.engine.elo !== 'undefined') { 
			console.log('Loading engine information elo = '+config.engine.elo) 
			engine_elo = config.engine.elo
		} 
		console.log('Starting chess engine...')
		const engine = new Engine(config.engine['path'])
		try { await engine.init() } catch(error) { 
			console.log('[ERROR] engine initialization') 
			process.exit(1)
		}
		console.log('Connected to '+engine.id.name)
		var engine_name = engine.id.name
		if (engine_description != '') engine_name = engine.id.name + ' ' + engine_description
		var c = 0
		await engine.isready()
		if (typeof config.uci_options.option != 'undefined') {
			while (typeof config.uci_options.option[c] !== 'undefined') { // parse engine options
				console.log('Loading option '+config.uci_options.option[c])
				var name = config.uci_options.option[c].split(' ')[1]
				var value = ''
				for (i=0; i < (config.uci_options.option[c].split(' ').length - 3); i++) {
					value = value + config.uci_options.option[c].split(' ')[(i+3)] + ' '
				}
				if (program.debug) { console.log('option name ' + name + ' value ' + value + 'sent to engine') }
				try { await engine.setoption(name, value) } catch(error) { console.log('[WARNING] setoption command failed') }
				await engine.isready()
				c++
			}
		}
		var go = {} // move settings
		if (typeof config.moves.depth !== 'undefined') {
			console.log('Loading move setting depth = '+config.moves.depth)
			go['depth'] = config.moves.depth
		}
		if (typeof config.moves.nodes !== 'undefined') {
			console.log('Loading move setting nodes = '+config.moves.nodes)
			go['nodes'] = config.moves.nodes
		}
		if (typeof config.moves.movetime !== 'undefined') {
			console.log('Loading move setting movetime = '+config.moves.movetime)
			go['movetime'] = config.moves.movetime
		}
				
		if (program.save) { console.log('Games to be saved as .pgn files') }
		pgnReset(true) // player is white
		console.log('Engine ready')
		console.log('Play time!')
		if (program.voice || program.voiceScore) {
			console.log("To toggle vocal score information on/off, click twice on your queen's root initial square")
		}
		if (program.voiceScore) {
			var voiceScore = 1
		} else {
			var voiceScore = 0
		}
		console.log("For hints, click twice on your queen's knight initial square")
		console.log('Human is playing white, engine is playing black')
		console.log("To change colours, click twice on your king's initial square")
		console.log("Good luck!")
		if (engine_name.indexOf('Lc0') > -1) {
			playText("introduction-lc0") // intro for Lc0
		} else if (engine_name.indexOf('Stockfish') > -1) {
			playText("introduction-stockfish") // intro for Stockfish
		} else {
			playText("introduction-2") // generic intro for other engines
		}
		if (program.web) {
			app.use('/favicon.ico', express.static('/favicon.png'));
			app.use(express.static(__dirname));
			router.get('/', (req, res) => res.sendFile('chessboard/medusa.html'))
			http.listen(3000, function(){ 
				console.log('Realtime webpage enabled at \'http://localhost:3000/chessboard/medusa.html\'')
			}) // nothing else should be coded after this
		}		
		// End of initialization
		
		// Misc functions
		
		function sendBoard(comm) {
			var data = new Buffer.from('x'+comm+'z')
			if (program.debug) { console.log('[debug] ' + data + ' sent to board') }
			characteristic_WWR.write(data, false, function(err) {
				if (err) { 
					console.log('[ERROR] Board connection failed')
					process.exit(1)
				}
			})
		}
		
		async function engineTurn() {
			console.log('Engine is thinking...')
			var result = await engine.go(go)
			var score_cp_value = 0
			var score_mate_value = 0
			var score_unit = ''
			var depth_value = 0
			var time_value = 0
			result.info.forEach(function(row) { // score is captured from last 'depth' info
				if (row.depth != undefined) {
					depth_value = row.depth
					time_value = parseFloat(row.time/1000).toFixed(1)
					if (row.score.unit == 'cp' ) { // score from white's perspective
						if (human_colour == 'white') {
							score_cp_value = parseFloat((row.score.value/100)*(-1)).toFixed(2) 
						} else {
							score_cp_value = parseFloat(row.score.value/100).toFixed(2) 
						}
					}
					if (row.score.unit == 'mate' ) { score_mate_value = row.score.value }
					score_unit = row.score.unit
				}
			})
			move_info = ''
			if (score_unit == 'mate') { 
				if (score_mate_value != 1) { move_info = '{#' + score_mate_value + '/' + depth_value + ' ' + time_value + 's}' }
			} else { 
				move_info = '{' + score_cp_value + '/' + depth_value + ' ' + time_value + 's}' 
			}
			if (program.debug) { console.log('[debug] ' + result.bestmove + ' received from engine') }
			move_info_array.push(move_info)
			// log move
			move['from'] = result.bestmove.substr(0,2)
			move['to'] = result.bestmove.substr(2,2)
			var san = chess.move(move)['san']
			chess.set_comment(move_info.slice(1,-1)) // insert move_info comments into pgn file
			if (chess.history().length == 1 ) { // first move
				pgn_file = getDateTime()+'.pgn'
			}
			if ((human_colour == 'white') && (chess.in_checkmate())) {chess.header('Result', '0-1') }
			if ((human_colour == 'black') && (chess.in_checkmate())) {chess.header('Result', '1-0') }
			if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) { chess.header('Result', '1/2-1/2') }
			var chess_pgn = getChessPGN()
			pgnSave(pgn_file, chess_pgn)
			webPGNUpdate(chess_pgn)
			if (human_colour == 'white') { webBoardUpdate({ orientation: 'white',position: chess.fen(),showNotation: false }) } else { webBoardUpdate({ orientation: 'black',position: chess.fen(),showNotation: false }) }
			// check score
			if (score_unit == 'cp' || score_unit == 'mate') { console.log('Engine played ' + san + ' ' + move_info) }
			if (score_unit != 'cp' && score_unit != 'mate') { console.log('Engine played ' + san) }
			sendBoard(result.bestmove)
			if (human_colour == 'white' && san == 'O-O') { sendBoard('h8f8') } // castling
			else if (human_colour == 'white' && san == 'O-O-O') { sendBoard('a8d8') }
			else if (human_colour == 'black' && san == 'O-O') { sendBoard('h1f1') }
			else if (human_colour == 'black' && san == 'O-O-O') { sendBoard('a1d1') }
			timer = 0
			if (chess.history().length == 1 ) { timer = 3500 }
			timer = playMove(san, timer)
			if (!(chess.in_checkmate() || chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition())) {
				if (score_unit == 'cp') { 
					if (program.voiceScore && (voiceScore == 1)) { timer = playScore(score_cp_value, timer) }
				} 
				if (score_unit == 'mate') { timer = playMate(score_mate_value, timer) }
			}
			if (chess.in_checkmate() || chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) { // end of game
				EOG_messages()
				sendBoard('RSTVAR')
				if (human_colour == 'white') { sendBoard('GAMEWHITE') } else { sendBoard('GAMEBLACK') }
				console.log('Choose colours by clicking twice on your king\'s initial square to start a new game.')
				timer = timer + 1000
				if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) { 
					setTimeout(() => { playText("draw") }, timer) 
					setTimeout(() => { playText("choose-colours") }, timer + 1750)
				} else { 
					setTimeout(() => { playText("choose-colours") }, timer) 
				}
				chess.reset()
				if (human_colour == 'white') { pgnReset(true) } else { pgnReset(false) }
				webTurnUpdate('')
			} else {
				if (human_colour == 'white') { webTurnUpdate('white to play') } else { webTurnUpdate('black to play') }
				console.log('Waiting for human...')
			}
		}
		
		function pgnSave(pgn_file) {
			if (program.save) {
				fs.writeFile('./pgn/'+pgn_file, chess.pgn(), 'utf-8', function(err) {
					if(err) {
						console.log('[WARNING] ' + err)
					}
				})
			}
		}
		
		function getChessPGN() {
			// insert 'move_info_array' into pgn game
			var new_pgn = chess.pgn()
			var nbr_moves = Math.round(chess.history().length/2)
			for (move_nbr = 1; move_nbr <= nbr_moves; move_nbr++) {
				if ((human_colour == 'white') && (nbr_moves == chess.history().length/2)) {	// insert into black move
					var move_str_B = ' ' + chess.history()[move_nbr*2-1]
					var move_str_W = move_nbr + '. ' + chess.history()[move_nbr*2-2]
					var i = new_pgn.search(move_nbr + '. ' + chess.history()[move_nbr*2-2] + ' ' + chess.history()[move_nbr*2-1])
					new_pgn = new_pgn.slice(0, i + move_str_W.length + move_str_B.length) + ' ' + move_info_array[move_nbr-1] + new_pgn.slice(i + move_str_W.length + move_str_B.length)
				}
				if ((human_colour == 'black') && (nbr_moves != chess.history().length/2)) {	// insert into white move
					var move_str_W = move_nbr + '. ' + chess.history()[move_nbr*2-2]
					var i = new_pgn.search(move_nbr + '. ' + chess.history()[move_nbr*2-2])
					new_pgn = new_pgn.slice(0, i + move_str_W.length) + ' ' + move_info_array[move_nbr-1] + new_pgn.slice(i + move_str_W.length)
				}
			}
			return new_pgn
		}
		
		function webBoardUpdate(data) {
			if (program.web) {
				io.emit('server-to-client-board-data', data)
				if (program.debug) { console.log('[debug] Board data sent to web client') }
			}
		}

		function webPGNUpdate(data) {
			if (program.web) {
				io.emit('server-to-client-pgn-data', data)
				if (program.debug) { console.log('[debug] PGN data sent to web client') }
			}
		}

		function webTurnUpdate(data) {
			if (program.web) {
				io.emit('server-to-client-turn-data', data)
				if (program.debug) { console.log('[debug] Turn data sent to web client') }
			}
		}
		
		function pgnReset(player_is_white) {
			var pgn_player = '?'
			var pgn_event = '?'
			var pgn_site = '?'
			var pgn_player_elo = '?'
			if (typeof config.pgn.Event !== 'undefined') { // pgn settings
				console.log('Loading pgn setting event = '+config.pgn.Event)
				pgn_event = config.pgn.Event
			}
			if (typeof config.pgn.Site !== 'undefined') {
				console.log('Loading pgn setting site = '+config.pgn.Site)
				pgn_site = config.pgn.Site
			}
			if (typeof config.pgn.Player !== 'undefined') {
				console.log('Loading pgn setting player = '+config.pgn.Player)
				pgn_player = config.pgn.Player
			} else {
				pgn_player = 'Human player'
			}
			if (typeof config.pgn.PlayerElo !== 'undefined') {
				console.log('Loading pgn setting player elo = '+config.pgn.PlayerElo)
				pgn_player_elo = config.pgn.PlayerElo
			}
			chess.header('Event', pgn_event)
			chess.header('Site', pgn_site)
			chess.header('Date',getDateTime().substr(0,10))
			if (player_is_white) {
				chess.header('White', pgn_player)
				chess.header('WhiteElo', pgn_player_elo)
				chess.header('Black', engine_name)
				chess.header('BlackElo', engine_elo)	
			} else {
				chess.header('White', engine_name)
				chess.header('WhiteElo', engine_elo)	
				chess.header('Black', pgn_player) 
				chess.header('BlackElo', pgn_player_elo)	
			}
		}
		
		function EOG_messages() {
			if (chess.in_checkmate()) { console.log('End of game: checkmate') }
			if (chess.in_draw()) { console.log('End of game: draw by 50-move rule or insufficient material') }
			if (chess.in_stalemate()) { console.log('End of game: draw by stalemate') }
			if (chess.in_threefold_repetition()) { console.log('End of game: draw by repetition of position')	}
		}
		
		function askQuestion(query) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			return new Promise(resolve => rl.question(query, ans => {
				rl.close();
				resolve(ans);
			}))
		}
		
		function getDateTime() {
			var date = new Date();
			var hour = date.getHours();
			hour = (hour < 10 ? "0" : "") + hour;
			var min  = date.getMinutes();
			min = (min < 10 ? "0" : "") + min;
			var sec  = date.getSeconds();
			sec = (sec < 10 ? "0" : "") + sec;
			var year = date.getFullYear();
			var month = date.getMonth() + 1;
			month = (month < 10 ? "0" : "") + month;
			var day  = date.getDate();
			day = (day < 10 ? "0" : "") + day;
			return year + "." + month + "." + day + "-" + hour + "." + min + "." + sec;
		}
		
		function playText(text) {
			// Synthesized audio generated by IBM Watson using British English (en-GB) Kate (female) (text-to-speech demo webpage)
			if (program.voice || program.voiceScore) { load('./audio/'+text+'.mp3').then(play) }	
		}
		
		function playMove(trans, timer) {
			if (program.voice || program.voiceScore) { 
				if (trans.indexOf("O-O-O") != -1) { // castling
					playText("O-O-O") 
					if (trans.indexOf("+") != -1) { setTimeout(() => { playText("+") }, timer+1750) } 
					return 2500
				} else if (trans.indexOf("O-O") != -1) { 
					playText("O-O") 
					if (trans.indexOf("+") != -1) { setTimeout(() => { playText("+") }, timer+1750) } 
					return 2500
				}
				// 6 characters max; piece translation only on 1st, 4st or 6st characters...
				var t = timer
				var ti = 750
				var c = 0
				var p1 = trans.substr(c,1)
				if (p1.indexOf('R') != -1) { p1 = 'rook' }
				if (p1.indexOf('N') != -1) { p1 = 'knight' }
				if (p1.indexOf('B') != -1) { p1 = 'bishop' }
				if (p1.indexOf('Q') != -1) { p1 = 'queen' }
				if (p1.indexOf('K') != -1) { p1 = 'king' }
				setTimeout(() => { playText(p1) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p2 = trans.substr(c,1)
				setTimeout(() => { playText(p2) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p3 = trans.substr(c,1)
				setTimeout(() => { playText(p3) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p4 = trans.substr(c,1)
				if (p4.indexOf('R') != -1) { p4 = 'rook' }
				if (p4.indexOf('N') != -1) { p4 = 'knight' }
				if (p4.indexOf('B') != -1) { p4 = 'bishop' }
				if (p4.indexOf('Q') != -1) { p4 = 'queen' }
				setTimeout(() => { playText(p4) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p5 = trans.substr(c,1)
				setTimeout(() => { playText(p5) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p6 = trans.substr(c,1)
				if (p6.indexOf('R') != -1) { p6 = 'rook' }
				if (p6.indexOf('N') != -1) { p6 = 'knight' }
				if (p6.indexOf('B') != -1) { p6 = 'bishop' }
				if (p6.indexOf('Q') != -1) { p6 = 'queen' }
				setTimeout(() => { playText(p6) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p7 = trans.substr(c,1)
				setTimeout(() => { playText(p7) }, t)
				t = t + ti
				return t
			}
		}
	
		function playScore(trans, timer) {
			timer = timer + 500
			setTimeout(() => { playText("score") }, timer); 
			var t = timer + 750
			var ti = 750
			var c = 0
			var p1 = trans.substr(c,1)
			setTimeout(() => { playText(p1) }, t)
			t = t + ti
			c++
			if (c == trans.length) return t
			var p2 = trans.substr(c,1)
			if (p2 == '.') p2 = 'point'
			setTimeout(() => { playText(p2) }, t)
			t = t + ti
			c++
			if (c == trans.length) return t
			var p3 = trans.substr(c,1)
			if (p3 == '.') p3 = 'point'
			setTimeout(() => { playText(p3) }, t)
			t = t + ti
			c++
			if (c == trans.length) return t
			var p4 = trans.substr(c,1)
			if (p4 == '.') p4 = 'point'
			setTimeout(() => { playText(p4) }, t)
			t = t + ti
			c++
			if (c == trans.length) return t
			var p5 = trans.substr(c,1)
			setTimeout(() => { playText(p5) }, t)
			t = t + ti
			c++
			if (c == trans.length) return t
			var p6 = trans.substr(c,1)
			setTimeout(() => { playText(p6) }, t)
			t = t + ti
			return t
		}
		
		function playMate(trans, timer) {
			if (program.voice || program.voiceScore) { 
				timer = timer + 250
				setTimeout(() => { playText("mate") }, timer); 
				var t = timer + 1250
				var ti = 750
				var c = 0
				var p1 = trans.substr(c,1)
				setTimeout(() => { playText(p1) }, t)
				t = t + ti
				c++
				if (c == trans.length) return t
				var p2 = trans.substr(c,1)
				setTimeout(() => { playText(p2) }, t)
				t = t + ti
				return t
			}
		}
		
		io.on('connection', function(socket){
			if (program.debug) { console.log('[debug] Web client connection received') }
			socket.on('client-to-server-data', function (data) { }) // not used
		})
		
	} catch(err) { 
		console.log('[ERROR] ' + err) 
		process.exit(1)
	} 
}
