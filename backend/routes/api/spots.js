const express = require('express');
const router = express.Router();
const { Spot } = require('../../db/models');
const { User, SpotImage } = require('../../db/models'); // Import User and SpotImage models

const { requireAuth } = require('../../utils/auth');
const { check, validationResult } = require('express-validator');


const spotValidation = [
  check('address').notEmpty().withMessage('Please provide a valid address.'),
  check('city').notEmpty().withMessage('Please provide a valid city.'),
  check('state').notEmpty().withMessage('Please provide a valid state.'),
  check('country').notEmpty().withMessage('Please provide a valid country.'),
  check('lat').isNumeric().withMessage('Please provide a valid latitude.'),
  check('lng').isNumeric().withMessage('Please provide a valid longitude.'),
  check('name').notEmpty().withMessage('Please provide a valid name.'),
  check('description').notEmpty().withMessage('Please provide a valid description.'),
  check('price').isNumeric().withMessage('Please provide a valid price.'),
];

// GET-SPOTS
// **********************************************************
router.get('/', async (req, res, next) => {
  try {
    const spots = await Spot.findAll({
      attributes: [
        'id', 'owner_id', 'address', 'city', 'state', 'country', 'lat', 'lng',
        'name', 'description', 'price', 'created_at', 'updated_at', 'preview_image', 'avg_rating'
      ],
    });

    res.json(spots);
  } catch (err) {
    next(err);
  }
});
// **********************************************************

// CREATE-SPOT
// **********************************************************
router.post('/', requireAuth, spotValidation, async (req, res, next) => {
  const { owner_id, address, city, state, country, lat, lng, name, description, price } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newSpot = await Spot.create({
      owner_id,
      address,
      city,
      state,
      country,
      lat,
      lng,
      name,
      description,
      price
    });

    res.status(201).json(newSpot);
  } catch (err) {
    next(err);
  }
});
// **********************************************************

// GET-ALL-SPOTS-OWNED-BY-CURRENT-USER
// **********************************************************
router.get('/my-spots', requireAuth, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const spots = await Spot.findAll({
      where: {
        owner_id: currentUserId,
      },
      attributes: [
        'id', 'owner_id', 'address', 'city', 'state', 'country', 'lat', 'lng',
        'name', 'description', 'price', 'created_at', 'updated_at', 'preview_image', 'avg_rating'
      ],
    });

    res.status(200).json({ Spots: spots });
  } catch (err) {
    next(err);
  }
});
// **********************************************************

// GET-SPOT-DETAILS-BY-ID
// **********************************************************
router.get('/spot/:id', async (req, res, next) => {
  try {
    const spotId = req.params.id;

    const spot = await Spot.findOne({
      where: {
        id: spotId,
      },
      attributes: [
        'id', 'owner_id', 'address', 'city', 'state', 'country', 'lat', 'lng',
        'name', 'description', 'price', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: SpotImage,
          as: 'spotImages',
          attributes: ['id', 'url', 'preview'],
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
    });


    if (!spot) {
      return res.status(404).json({ message: "Spot couldn't be found" });
    }

    res.status(200).json(spot);
  } catch (err) {
    next(err);
  }
});
// **********************************************************

// ADD IMAGE TO SPOT ID
// **********************************************************
router.post('/spot/:id/images', requireAuth, async (req, res, next) => {
  const spotId = req.params.id;
  const { url, preview } = req.body;

  const spot = await Spot.findOne({
    where: {
      id: spotId,
      owner_id: req.user.id,
    },
  });

  if (!spot) {
    return res.status(404).json({ message: "Spot couldn't be found" });
  }

  const newImage = await SpotImage.create({
    spot_id: spot.id,
    url,
    preview,
  });

  res.status(200).json({
    id: newImage.id,
    url: newImage.url,
    preview: newImage.preview,
  });
});
// **********************************************************

// EDIT SPOT BY ID
// **********************************************************
router.post('/:id', requireAuth, async (req, res, next) => {
  const currentUserId = req.user.id;
  const spotId = req.params.id;
  const {
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price
  } = req.body;

  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Bad Request', errors: errors.mapped() });
  }

  try {
    // Find the spot to update
    const spot = await Spot.findOne({
      where: {
        id: spotId,
        owner_id: currentUserId,
      },
    });

    // If the spot doesn't exist, return a 404 response
    if (!spot) {
      return res.status(404).json({ message: "Spot couldn't be found" });
    }

    // Update the spot's properties
    if(address) spot.address = address;
    if(city) spot.city = city;
    if(state) spot.state = state;
    if(country) spot.country = country;
    if(lat) spot.lat = lat;
    if(lng) spot.lng = lng;
    if(name) spot.name = name;
    if(description) spot.description = description;
    if(price) spot.price = price;

    // Save the updated spot to the database
    await spot.save();

    // Return the updated spot object
    res.json(spot);
  } catch (err) {
    next(err);
  }
});
// **********************************************************

module.exports = router;
