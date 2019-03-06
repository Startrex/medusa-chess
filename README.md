# Medusa Chess

A free Node.js interface tool for Bluetooth electronic boards and chess engines powered by the UCI (Universal Chess Interface) protocol.

## Description

Usually we are only able to use electronic chess boards to play against a built-in engine, or connecting to specific sites. What if we could use an electronic board to play against a local chess engine installed in our PC? Now this is possible!

Inspired by the fantastic Square Off board, and Leela Chess Zero, we are now able to play against any engine using our electronic board.

Basically all we have to do is to install Medusa and a chess engine. Medusa will act as an 'middle-man' between the UCI engine and the board.

And if that's not enough, we have powered Medusa with voice feedback. So we can hear what our engine has to say like a human player. We can hear the engine moves, score, and all the necessary information.

The combination of a magical electronic board like Square Off, AI chess engines like Leela Chess Zero, and voice feedback is like a childhood dream coming true!

Hope you enjoy Medusa as much as I do. Any feedback please feel free to contact me on Discord as zandora#5443.

## Installation

Medusa runs on a command-line interface.

<ul>
<li>Install Node.Js from <a href="https://nodejs.org/en/download/">here</a></li>
<li>Download medusa-chess from GitHub using the link on top of the page</li>
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
```

Depending on your system environment and the tools installed, **nobble** may or may not work out of the box. Please visit <a href="https://github.com/sandeepmistry/noble">https://github.com/sandeepmistry/noble</a> on how to install all the prerequisites for noble.

Getting bluetooth to work is the most difficult part, but it should not be an issue if you follow the instructions and/or you get the appropriate hardware. As my native laptop's bluetooth adapter was not supported by noble, I just got this <a href="https://www.amazon.co.uk/Bluetooth-Yeung-Qee-Compatible-computers-black-1/dp/B07F67Q2KV/ref=sr_1_1?ie=UTF8&qid=1551884488&sr=8-1&keywords=CSR8510+A10+bluetooth+adapter">cheap dongle</a> from Amazon, and it worked perfectly!

## Configuration

Configuration can be changed by editing the file **medusa.config**. 

Sections are separated by '[ ]', and commented lines start with a ';'. We have 4 main sections:

<ul>
<li>Engine: enter the full absolute path to the installed engine.</li>
<li>Moves: select how moves are to be calculated by engine (UCI 'go' command). Choose either desired depth, nodes or movetime.</li>
<li>UCI_options: select options that can be loaded by UCI command 'option'. Check engine documentation for what's available.</li>
<li>PGN: configure how .pgn files (games) will be created. Other fields can also be inserted (ELO, Round, etc).</li>
</ul>

```
;configuration file

[engine]
path = [enter full absolute path folder here]/lc0.exe
;path = [enter full absolute path folder here]/stockfish_10_x64.exe

[moves]
;pick one:
;depth = 3
;nodes = 20
movetime = 2000

[uci_options]
;check engine documentation for available options
option[] = name Threads value 4

[pgn]
Event = 'Casual Game'
Site = 'London, UK'
Player = 'Human player'
```

## Usage

```bash
node medusa         # Starts the basic interface
node medusa --help  # Show command-line usage and options
node medusa --voice # Activates engine voice
node medusa --save  # Save games in the pgn folder
```

## Support

This software is provided without warranty of any kind. In case, you can try to contact me on Discord as zandora#5443.

## Contributing

Support for different boards, new features, fixing bugs and pull requests are welcome! For major changes, please open an issue first to discuss.

Thanks.

## License
[MIT](https://choosealicense.com/licenses/mit/)
