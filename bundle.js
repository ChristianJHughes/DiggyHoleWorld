(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./player.js":2,"./tileMap.js":3}],2:[function(require,module,exports){
// player.js
//
// Contains all of the constructs for creating and rendering a player from a sprite sheet.
//
// Author: Christian Hughes


module.exports = (function() {
  var _sprite = {};
  var _spriteSheet = new Image();
  var _frameIndex;
  var _tickCount;
  var _ticksPerFrame;
  var _numberOfFrames;
  var _width;
  var _height;
  var _initialized = false;
  var _context;
  var _spriteSheetYStart = 0; // The y value (basically, which row) that we want to begin animating on the sprite sheet.
  var _spriteSheetXStart = 0;
  var _spriteWidth;
  var _directionFacing = "right";
  var _xOnMap = 0; // The x value of the sprite on the map.
  var _yOnMap = 0; // The y value of the sprite on the map. Must be a mulitple of 5.
  var _onSolidGroundFunction;
  var _tileMap;
  var _mapWidth;
  var _mapHeight;
  var _isJumping = false;
  var _jumpingApex = 120;
  var _justFinishedJump = false;
  var _currentJumpDistance = 0;
  var _gravityConstant = 5;
  var _jumpSpeed = 5;
  var _isFallingFromJump = false;
  var _isInAir = false;

  // These event listeners will automatically be listening for keypresses (both up and down).
  // They will update the KeyState object based on the specific key pressed, as well as its its state.
  window.addEventListener('keyup', function(event) { KeyState.onKeyup(event); });
  window.addEventListener('keydown', function(event) { KeyState.onKeydown(event); });

  // The code for this helper object is very similar to the one described here:
  // http://nokarma.org/2011/02/27/javascript-game-development-keyboard-input/
  //
  // This keeps track of which key is pressed so that the game objects can update
  // at the same speed as the game loop (and not independently). Variable names are
  // changed to make the logic simpler to grasp.
  var KeyState =
  {
    // An object keeping track the key(s) being pressed. The keyCode will be true if so.
    pressedKey: {},

    // A function that updates the pressed key object while the key is pressed down.
    onKeydown: function(eventListenerPassedThisIn) {
      this.pressedKey[eventListenerPassedThisIn.keyCode] = true;
    },
    // Deletes the keyCode property of the key that was just released from pressedKey.
    onKeyup: function(eventListenerPassedThisIn) {
      this.pressedKey[eventListenerPassedThisIn.keyCode] = false;
    },
    // Returns true if the key with the current keyCode is currently down.
    isDown: function(keyCode)
    {
      return this.pressedKey[keyCode];
    }
  };

  _sprite.initialize = function (imgSource, context, width, height, numberOfFrames, ticksPerFrame, tileMap, mapWidth, mapHeight)
  {
    // Set the tilemap as uninitialized until the image loads.
    _initialized = false;
    _spriteSheet.onload = function() {
      _initialized = true;
    }

    // Assign all private variables.
    _spriteSheet.src = imgSource;
    _context = context;
    _width = width;
    _height = height;
    _frameIndex = 0,
    _tickCount = 0,
    _ticksPerFrame = ticksPerFrame || 0,
    _numberOfFrames = numberOfFrames || 1;
    _spriteSheetYStart = 17;
    _tileMap = tileMap;
    _mapWidth = mapWidth;
    _mapHeight = mapHeight;
    _spriteWidth = _width / _numberOfFrames;

  };
  // Iterates the frame on the sprite sheet with each update cycle.
  _sprite.updateFrame = function() {
    _tickCount += 1;

    if (_tickCount > _ticksPerFrame)
    {
      _tickCount = 0;

      // If the current frame index is in range.
      if (_frameIndex < _numberOfFrames - 1)
      {
        _frameIndex += 1;
      }
      else
      {
        _frameIndex = 0;
      }
    }
  };

  // Renders the sprite as an image to the canvas.
  _sprite.render = function () {
        // Draw the animation
        _context.drawImage(
          _spriteSheet,
          _spriteSheetXStart,
          _spriteSheetYStart,
          _width / _numberOfFrames,
          _height,
          _xOnMap,
          _yOnMap,
          _width / _numberOfFrames,
          _height);
    };

  _sprite.update = function() {
      var bottomOfCharacter = _yOnMap + 5 - (_height % 5) + _height;
      var rightOfCharacter = _xOnMap + 5 - (_height % 5) + _height;
      var currentTile = _tileMap.returnTile(_xOnMap, _yOnMap, _height, _width, "current");
      var leftTile = _tileMap.returnTile(_xOnMap, _yOnMap, _height, _width, "left");
      var rightTile = _tileMap.returnTile(_xOnMap, _yOnMap, _height, _width, "right");
      var downTile = _tileMap.returnTile(_xOnMap, _yOnMap, _height, _width, "down");
      var feetRight = _tileMap.returnTile(_xOnMap + _spriteWidth-1, bottomOfCharacter + 1, _height, _width, "right");
      var feetLeft = _tileMap.returnTile(_xOnMap, bottomOfCharacter - 1, _height, _width, "left");

      // Assumes that veolocity will always intersect exactly with tile boundaries.
      if (!downTile.isSolid || !(bottomOfCharacter % (_mapHeight / 10) === 0))
      {
        _yOnMap += _gravityConstant;
      }
      else
      {
        _numberOfFrames = 4;
        if (_justFinishedJump && _directionFacing === "right")
        {
          _justFinishedJump = false;
          _frameIndex = 3;
        }
        else if (_justFinishedJump && _directionFacing === "left")
        {
          _justFinishedJump = false;
          _frameIndex = 0;
        }
        _width = _spriteWidth * _numberOfFrames;
        _spriteSheetXStart = _frameIndex * _width / _numberOfFrames;
      }

      // Right Arrow moves character to the right. Changes direction, and gets the correct coordinates from the sprite sheet.
      if (KeyState.isDown(39))
      {
        // Ensure the sprite doesn't move beyond the right bounds of the screen.
        if (_xOnMap + (_width / _numberOfFrames) >= _mapWidth)
        {
          _xOnMap = _mapWidth - (_width / _numberOfFrames);
        }
        else if (!rightTile.isSolid)  // || !rightTile.isSolid)) // || !(rightOfCharacter % (_mapWidth / 10) === 0))
        {
          _xOnMap += 5;
        }
          _spriteSheetYStart = 17;
          _height = 63;
          _directionFacing = "right";
          if (!_isJumping)
          {
            _sprite.updateFrame();
          }
      }

      // Left Arrow moves character left. Changes direction, and gets the correct coordinates from the sprite sheet.
      else if (KeyState.isDown(37))
      {
        // Ensure the sprite doesn't move beyond the left bounds of the screen.
        if (_xOnMap - 5 >= 0 && !leftTile.isSolid)
        {
          _xOnMap -= 5;
        }
        _spriteSheetYStart = 248;
        _height = 63;
        _directionFacing = "left";
        if (!_isJumping)
        {
          _sprite.updateFrame();
        }
      }

      // If the up arrow is being pressed, it is time to jump.
      if (KeyState.isDown(38))
      {
        if (!_isInAir && !_isFallingFromJump)
        {
          _isJumping = true;
          _isInAir = true;
          _currentJumpDistance = 0;
        }
      }

      if (_isJumping)
      {
        // Check to make sure the sprite isn't jumping off the screen.
        if (_yOnMap - 11 <= 0)
        {
          _yOnMap = 0;
        }
        // Else, we begin the jumping state machine.
        else
        {
          if (_isInAir)
          {
            _yOnMap -= (_gravityConstant + _jumpSpeed);
            _currentJumpDistance += _jumpSpeed;
            if (_currentJumpDistance >= _jumpingApex)
            {
              _isInAir = false;
              _isFallingFromJump = true;
            }
          }
          else if (_isFallingFromJump)
          {
            _currentJumpDistance -= _gravityConstant;
          }
        }
        if (_directionFacing === "right" || _directionFacing === "left")
        {
          if (_directionFacing === "right")
          {
            _spriteSheetYStart = 82;
          }
          else if (_directionFacing === "left")
          {
            _spriteSheetYStart = 312;
          }
          _numberOfFrames = 1;
          _width = _spriteWidth;

          // If we're in the first half of the jump, use the first animation frame.
          if ((_currentJumpDistance <= _jumpingApex / 2) && _isInAir)
          {
            if (_directionFacing === "right")
            {
              _spriteSheetXStart = _spriteWidth * 0;
            }
            else if (_directionFacing === "left")
            {
              _spriteSheetXStart = _spriteWidth * 3;
            }
            _spriteSheetXStart = _spriteWidth * 0;
          }
          // If we're in the second half of the jump, use the second animation frame.
          else if ((_currentJumpDistance >= _jumpingApex / 2) && _isInAir)
          {
            if (_directionFacing === "right")
            {
              _spriteSheetXStart = _spriteWidth * 1;
            }
            else if (_directionFacing === "left")
            {
              _spriteSheetXStart = _spriteWidth * 2;
            }
          }
          // IF we're in the first half of the falling animation, use the third frame.
          else if ((_currentJumpDistance >= _jumpingApex / 2) && _isFallingFromJump)
          {
            if (_directionFacing === "right")
            {
              _spriteSheetXStart = _spriteWidth * 2;
            }
            else if (_directionFacing === "left")
            {
              _spriteSheetXStart = _spriteWidth * 1;
            }
          }
          // If we're in the second half of the falling animation, use the fourth animation frame.
          else if ((_currentJumpDistance <= _jumpingApex / 2) && _isFallingFromJump)
          {
            if (_directionFacing === "right")
            {
              _spriteSheetXStart = _spriteWidth * 3;
            }
            else if (_directionFacing === "left")
            {
              _spriteSheetXStart = _spriteWidth * 0;
            }
          }
          _height = 77;
        }

        if (_currentJumpDistance <= 0)
        {
          _isFallingFromJump = false;
          _isJumping = false;
          _justFinishedJump = true;
        }
      }

  };

  return _sprite;
}());

},{}],3:[function(require,module,exports){
// tileMap.js
//
// Heavy modification of simple_tilemap construct by Nathan Bean. Used with permission.
// *Creates Terrain objects based on the given sprite sheet, then generates a semi random tile map.
//  Returns a variable to the _tilemap object, which includes update() & render() methods, among other things.
//  game.js requires this file, which is ensured by the Browserify framework.*
//
// Author: Christian Hughes

module.exports = (function() {
  // All of these variables are private. The only variable that will be returned is the _tilemap.
  var _tilemap = {},
      _tileset = new Image(),
      _tileWidth,
      _tileHeight,
      _tilesPerRow,
      _map,
      _mapWidth,
      _mapHeight,
      _context,
      _initialized = false;

   // An enumeration of the differnt terrain types (based off of the indecies of differnt materials in the tile sheet).
   var terrainTypes =
   {
     WATER1: 0,
     STONE_UNDERGOUND1: 1,
     STONE_UNDERGROUND2: 2,
     EARTH_UNDERGROUND1: 3,
     EARTH_UNDERGROUND2: 4,
     WATER2: 5,
     EARTH_SURFACE1: 6,
     EARTH_SURFACE2: 7,
     EARTH_UNDERGROUND3: 8,
     EARTH_UNDERGROUND4: 9,
     WATER3: 10,
     STONE_SURFACE1: 11,
     STONE_SURFACE2: 12,
     LAVA1: 13,
     BOX1: 14,
     ICE: 15,
     MINE1: 16,
     MINE2: 17,
     LAVA2: 18,
     BOX_OUTLINE: 19,
     NOTHING: 20,
     CAVERN1: 21,
     CAVERN2: 22,
     LAVA3: 23,
     BOX2: 24
   };

   // Constructor for a terrain object.
   //
   // Parameters:
   // terrainType - An int value describing the index of the terrain tyle on the tile sheet.
   // isSolid - A bool value denoting whether or not the given terrain is solid.
   function Terrain(terrainType, isSolid)
   {
     this.terrainType = terrainType;
     this.isSolid = isSolid;
   };

   // Create all of the terrain objects that will be used for this game world.
   var earthSurface = new Terrain(terrainTypes.EARTH_SURFACE1, true);
   var stoneSurface = new Terrain(terrainTypes.STONE_SURFACE1, true);
   var earthUnderground = new Terrain(terrainTypes.EARTH_UNDERGROUND1, true);
   var stoneUnderground = new Terrain(terrainTypes.STONE_UNDERGOUND1, true);
   var cavern = new Terrain(terrainTypes.CAVERN2, false);
   var nothing = new Terrain(terrainTypes.NOTHING, false);
   var mine = new Terrain(terrainTypes.MINE1, false);

  // Returns a tile object based on where the character is standing.
  _tilemap.returnTile = function(xCord, yCord, characterHeight, characterWidth, tileLocation)
  {
    var yValue = Math.floor((yCord) / _tileHeight);
    var xValue = Math.floor(xCord / _tileWidth);
    if (tileLocation === "left")
    {
      if ((yValue * _mapWidth + xValue - 1) > 0)
      {
        return _map[yValue * _mapWidth + xValue - 1];
      }
      else
      {
        return nothing;
      }
    }
    else if (tileLocation === "right")
    {
      return _map[yValue * _mapWidth + xValue + 1];
    }
    else if (tileLocation === "current")
    {
      return _map[yValue * _mapWidth + xValue];
    }
    else if (tileLocation === "down")
    {
      return _map[yValue * _mapWidth + xValue + _mapWidth];
    }
  }

  _tilemap.update = function()
  {

  }

  // Initializes the tilemap.
  //
  // Parameters:
  // tilesetPath - A relative or absolute url to the tileset image fileCreatedDate.
  // tileWidth - The width of tiles, in pixels.
  // tileHeight - The height of tiles, in pixels.
  // mapWidth - The width of the map in tiles.
  // mapHeight - The height of the map in tiles.
  // context - The context of the canvas being drawn to.
  //
  // Note: The tiles are assumed to start in the upper-left hand corner of the tileset image and run left-to-right.
  _tilemap.initialize = function(tilesetPath, tileWidth, tileHeight, mapWidth, mapHeight, context) {
    var mapSize = mapWidth * mapHeight;

    // Set the tilemap as uninitialized until the image loads.
    _initialized = false;
    _tileset.onload = function() {
      _tilesPerRow = Math.floor(_tileset.width / _tileWidth);
      _initialized = true;
    }

    // Set the private variables
    _tileset.src = tilesetPath;
    _tileWidth = tileWidth;
    _tileHeight = tileHeight;
    _mapWidth = mapWidth;
    _mapHeight = mapHeight;
    _map = new Array(mapSize);
    _context = context;

    // Returns a random Boolean value for use in randomly generating the world.
    function returnRandomBool()
    {
      if (Math.floor(Math.random() * 2) == 1)
      {
        return true;
      }
      return false;
    }

    // Creates a new row, based on the the previous row translated 1 tile in given direction.
    function createRift(previousMapRow, direction)
    {
      var previousStartIndex = previousMapRow * _mapWidth;
      var newRowStartIndex = previousStartIndex + _mapWidth;

      if (direction === "right")
      {
        for (var i = 0; i < _mapWidth - 1; i++)
        {
          _map[newRowStartIndex + i + 1] = _map[previousStartIndex + i];
        }
        _map[newRowStartIndex] = _map[previousStartIndex + _mapWidth - 1];
      }
      else if (direction === "left")
      {
        for (var i = 0; i < _mapWidth - 1; i++)
        {
          _map[newRowStartIndex + i] = _map[previousStartIndex + 1 + i];
        }
        _map[newRowStartIndex + _mapWidth - 1] = _map[previousStartIndex];
      }
      else if (direction === "none")
      {
        for (var i = 0; i < _mapWidth; i++)
        {
          _map[newRowStartIndex + i] = _map[previousStartIndex + i];
        }
      }

      // If we're making the 5th row (index 4), then we want to convert all of the surface tiles to underground tiles.
      if (newRowStartIndex === 4 * _mapWidth)
      {
        for (var i = newRowStartIndex; i < newRowStartIndex + _mapWidth; i++)
        {
          if (_map[i] === stoneSurface)
          {
            _map[i] = stoneUnderground;
          }
          else if (_map[i] === earthSurface)
          {
            _map[i] = earthUnderground;
          }
        }
      }
    };

    // Randomly generates the tileMap. The top three rows (sky) are constant.
    // The entire underground is randomly generated by making geologic "rifts" at random in each new layer.
    function createNewRandomMap()
    {
      // First, fill the whole map with nothing.
      for (var i = 0; i < _map.length; i++)
      {
          _map[i] = nothing;
      }

      // Make the first surface tile either stone or earth at random.
      if (returnRandomBool())
      {
        _map[_mapWidth * 3] = earthSurface;
      }
      else
      {
        _map[_mapWidth * 3] = stoneSurface;
      }

      // Ensures that the surface groups similar tiles together in groups of at least two.
      var continueChain = true;

      // The top three rows will remain nothing objects. This can represent the "sky" for the game.
      // We will begin by laying surface tiles in the fourth row of the grid.
      for (var i = _mapWidth * 3 + 1; i < _mapWidth * 4; i++)
      {
        // We begin by picking a random surface material, then ensuring it is paired with AT LEAST one similar surface tile.
        if (continueChain)
        {
            _map[i] = _map[i-1];
            // if (i + 1 < _mapWidth * 4)
            // {
            //   i++;
            //   _map[i] = earthSurface;
            // }
          continueChain = false;
        }
        // After a group of at least two is established, add random tiles one by one.
        else
        {
          if (returnRandomBool())
          {
            _map[i] = earthSurface;
          }
          else
          {
            _map[i] = stoneSurface;
          }
          // Check to see if the current tile is different from the last one.
          // If so, we want to begin a new chain (group of at least two of the same tile).
          if (_map[i] !== _map[i-1])
          {
            continueChain = true;
          }
        }
      }

      // Next, we need to generate all of the underground tiles.
      // We do so by creating "rifts" at random for all of the underground rows.
      for (var i = 3; i < _mapHeight; i++)
      {
        // Choose a new random rift direction for each row. In this version, there is a 66% chance of rifting right, and a 33% chance of remaining no rift at all.
        var randomRift = Math.floor(Math.random() * 3) + 1;
        var direction;
        if (randomRift === 1 || randomRift === 2)
        {
          direction = "right";
        }
        else if (randomRift === 3)
        {
          direction = "none";
        }
        createRift(i, direction);
      }

      // Next we need to add a cavern(s)! At least one,  perhaps 2.
      var numberOfCaverns = Math.floor(Math.random() * 2) + 1;
      for (var i = 0; i < numberOfCaverns; i++)
      {
        // Get a random width and height for the cavern, between 2 and 3. Place it on a random valid area of the map.
        var widthOfCavern = Math.floor(Math.random() * 2) + 2;
        var heightOfCavern = Math.floor(Math.random() * 2) + 2;
        var xIndexToBegin = Math.floor(Math.random() * (_mapWidth - widthOfCavern));
        var yIndexToBegin = Math.floor(Math.random() * (_mapHeight - heightOfCavern - 4)) + 4; // Ensure that caverns only appear below the surface.
        // Redner the tiles on the map.
        for (var x = xIndexToBegin; x < xIndexToBegin + widthOfCavern; x++)
        {
          _map[x + (yIndexToBegin * _mapWidth)] = cavern;
          for (var y = 1; y < heightOfCavern; y++)
          {
            _map[x + (yIndexToBegin * _mapWidth) + (y * _mapWidth)] = cavern;
          }
        }
      }
    };

    // Call the createNewRandomMap() function to populate the tileMap in a realistic way.
    createNewRandomMap();
    // _map[34] = nothing; // Can be used for testing collision detection.
  }

  // Draws the tilemap using the provided context
  //
  // Parameters:
  // context - The canvas context to draw the tilemap into
  _tilemap.render = function() {
    if(_initialized) {
      _context.save();
      for(var y = 0; y < _mapHeight; y++) {
        for(var x = 0; x < _mapWidth; x++) {
          // Render tile at (x,y)
          // The _map is full of terrain objects. We want to get the terrain type (which is the index of the given terrain in the tile sheet).
          var tileSheetIndex = _map[y * _mapWidth + x].terrainType;
          var sx = Math.floor(tileSheetIndex / _tilesPerRow);
          var sy = tileSheetIndex % _tilesPerRow;
          _context.drawImage(
            _tileset,
            _tileWidth * sx,
            _tileHeight * sy,
            _tileWidth,
            _tileHeight,
            x * _tileWidth,
            y * _tileHeight,
            _tileWidth,
            _tileHeight
          );
        }
      }
      _context.restore();
    }
  };

  return _tilemap;

}());

},{}]},{},[1]);
