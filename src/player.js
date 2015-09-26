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
