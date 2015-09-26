// game.js
//
// Contains game object declerations, as well as the main game loop.
// Imports the tileMap and player files via Browserify, which ensure that all files are loaded correctly.
//
// Author: Chrisian Hughes

var tileMap = require('./tileMap.js');
var playerSprite = require('./player.js');

window.onload = function() {
  // Store the canvas and define its size. This is the bottom layer containing the game world.
  var canvas = document.getElementById("DiggyHoleCanvas");
  canvas.width = 850;
  canvas.height = 850;
  //Get the canvas context, and assign to a variable.
  var context = canvas.getContext("2d");

  tileMap.initialize(
    "images/underground_tiles_scaled.png",
    85,
    85,
    10,
    10,
    context
  );

  playerSprite.initialize("images/dwarf_sprite_sheet_scaled.png", context, 320, 63, 4, 4, tileMap, canvas.width, canvas.height);


  // Updates all game objects.
  function update()
  {
    playerSprite.update();
  }

  // Renders all game objects. Clears the entire canvas on each redraw.
  function render()
  {
    context.clearRect(0, 0, canvas.width, canvas.height);
    tileMap.render();
    playerSprite.render();
  }

  function gameLoop() {
    update();
    render();
    window.requestAnimationFrame(gameLoop);
  }

  // Begin the gameLoop(), and the game.
  gameLoop();

}
