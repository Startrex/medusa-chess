# Medusa Chess

Medusa is a free Node.js interface tool for Bluetooth electronic boards and chess engines powered by the UCI protocol.

## Description

Usually we are only able to use electronic chess boards to play against a built-in engine, or connecting to specific sites. What if we could use an electronic board to play against a local chess engine installed on our PC?... 

Inspired by the fantastic Square Off board, and Leela Chess Zero, we are now able to play against any engine using the electronic board.

Basically all we have to do is to install Medusa and a chess engine. Medusa will act as a middleman between the UCI engine and the board.

We have also powered Medusa with voice capabilities, so we can hear what the engine has to say like a human player. The engine speaks up about its moves, score, and all the necessary information. In addition, we have the option to follow up a game in realtime in a graphic board on a local webpage, and even stream it if we want to.

So we end up with the combination of a smart board where pieces move by themselves like Square Off, and our choice of chess engines like Leela Chess Zero, and a naturally pleasant vocal feedback.

In my case, I configured a Raspberry Pi Zero with medusa starting up from the booting process, which I leave it powered on all the time. This allows a great always-on experience, where everytime I want to play I just switch on Square Off, and start playing. For the engine itself, I'm using Lc0 with Mean Girl distilled network for lots of fun!

Hope you enjoy Medusa as much as I do. Please feel free to join our <a href="https://discord.gg/ZYAj4FJ">Medusa Chess channel</a> on Discord.

Note: Medusa currently only supports Square Off board, and should work with any UCI chess engine - tested with Leela Chess Zero (Lc0) and Stockfish.

## Installation

Medusa runs in a command-line interface.

<ul>
<li>Install Node.Js from <a href="https://nodejs.org/en/download/">here</a>.</li>
<li>Download medusa-chess from GitHub using the link on top of the page.</li>
<li>Install all dependencies via npm:</li>
</ul>

```bash
cd medusa-chess
npm install commander
npm install brfs
npm install ini
npm install node-uci
npm install chess.js
npm install audio-play
npm install audio-loader
npm install noble
npm install express
npm install socket.io
```
or simply

```bash
cd medusa-chess
npm install
```

Depending on your system environment and the tools installed, **nobble** may or may not work out of the box. Please visit <a href="https://github.com/sandeepmistry/noble">https://github.com/sandeepmistry/noble</a> on how to install all the prerequisites for noble.

Getting bluetooth to work is the most difficult part, but it should not be an issue if you follow the instructions and/or you get the appropriate hardware. As my native laptop's bluetooth adapter was not supported by noble, I just got this <a href="https://www.amazon.co.uk/Bluetooth-Yeung-Qee-Compatible-computers-black-1/dp/B07F67Q2KV/ref=sr_1_1?ie=UTF8&qid=1551884488&sr=8-1&keywords=CSR8510+A10+bluetooth+adapter">cheap dongle</a> from Amazon, and it worked perfectly!

Also, in case errors (this happened to me recently with package chess.js), try going for the latest available package, for instance:

```
npm install chess.js@latest
```

## Configuration

Configuration can be changed by editing the file **medusa.config**. 

Sections are separated by '[ ]', and commented lines start with a ';'. We have 4 main sections:

<ul>
<li>Engine: enter the full absolute path to the installed engine. Optionally, we can also enter some sort of description and the estimated Elo information for our hardware and configuration below.</li>
<li>Moves: select how moves are to be calculated by engine (UCI 'go' command). Choose either desired depth, nodes or movetime.</li>
<li>UCI_options: select options that can be loaded by UCI command 'option'. Check engine documentation for what's available.</li>
<li>PGN: configure how .pgn files (games) will be created. Only these basic fields are available, however files will be created with some other details like engine move score, depth, time, etc.</li>
</ul>

```
;configuration file

[engine]
path = [enter full absolute path folder here]/lc0.exe
description = '<mean girl 8> 10n'
elo = 1850
;path = [enter full absolute path folder here]/stockfish_10_x64.exe
;description = 'bla bla bla'
;elo = 3200

[moves]
;pick one:
;depth = 3
nodes = 10
;movetime = 2000

[uci_options]
;check engine documentation for available options
;option[] = name Threads value 4

[pgn]
Event = 'Casual Game'
Site = 'London, UK'
Player = 'Human player'
PlayerElo = '?'
```

## Usage

```bash
node medusa               # Start the basic interface
node medusa --help        # Show command-line usage and options
node medusa --voice       # Activate engine voice
node medusa --voice-score # Activate engine voice with score information 
node medusa --web         # Enable realtime webpage on 'http://localhost:3000/chessboard/medusa.html'
node medusa --save        # Save games in the pgn folder
```

## Operation

Medusa offers a full messaging console where every piece of action is output. If you are a developer, you can try the '--debug' option for more.

There are some runtime commands that can be issued directly from the board. This allows a seamless integration with a 'sound only' interface configuration, so no need to check messages on console. Perfect for a always-on RPI running on the background, so all we have to do is to turn on the board to start playing...

For hints, click twice on your queen's knight initial square.

To toggle vocal score information on/off, click twice on your queen's root initial square. If voice is activated, this enables score information to be announced (or toggled off) in case 'voice-score' was not selected at startup.

To start a new game (and even be able to change colours), click twice on your king's initial square. Remember to play at the other side of the board (do not only swap pieces).

Medusa has also a built-in web server, this enables matches to be followed live on port 3000 of the server... :)

## Support

You can reach me on Discord as zandora#5443.

## Contributing

Support for different boards, new features, fixing bugs and pull requests are welcome. For major changes, please open an issue first to discuss.

Thanks.

## Acknowledgment

Thank you to all who have contributed in this great project.

Synthesized audio generated by IBM Watson.

## License
[MIT](https://choosealicense.com/licenses/mit/)
