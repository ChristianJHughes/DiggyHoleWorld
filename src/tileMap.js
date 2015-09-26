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
