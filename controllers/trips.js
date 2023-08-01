const Trip = require('../models/Trip');
const mongoose = require('mongoose');
//const Invoice = require('../models/Invoice');
const { NotFoundError, ErrorResponse, MissingRequiredError } = require('../utils/errors');
const CustomerAddress = require('../models/CustomerAddress');
const Customer = require('../models/Customer');
const Driver = require('../models/Driver');
const { checkFields } = require('../middleware/checkFields');
const url = require('url');
const { allowedStatuses, driverAllowedStatuses, tripStatuses, driverOpenStatuses, driverUnallowedStatuses, cancelledStatuses } = require('../constants/allowedStatuses');

// POST /trips
exports.createTrip = async (req, res, next) => {
  let allowedFields = [
    'pickupAddress', 'dropoffAddress', 'tripScheduleTime',
    'dispatchTime', 'completedTime', 'pickupName', 'dropoffName',
    'pickupPhone', 'dropoffPhone', 'pickupNote', 'dropoffNote',
    'packageType', 'numberOfPackages', 'customer'
  ];

  const fields = checkFields(req.body, allowedFields);
  if (fields instanceof Error) return next(fields);

  if (req.body.customer) {
    req.body.customer =
      req.user.role === 'Dispatcher' ? req.body.customer : req.user.roleObject._id;
  }

  let promises = await Promise.all([
    req.body.dropoffAddress ? CustomerAddress.find({ _id: req.body.dropoffAddress }) : '',
    req.body.pickupAddress ? CustomerAddress.find({ _id: req.body.pickupAddress }) : '',
    req.body.customer && req.user.role === 'Dispatcher' ? Customer.findById(req.body.customer) : req.user.roleObject._id,
    req.body.driver ? Driver.findById(req.body.driver) : 1
  ]);

  if (!promises[0] || !promises[1]) {
    return next(new NotFoundError('Address', 400));
  }
  if (!promises[2]) {
    return next(new NotFoundError('Customer', 400));
  }
  if (!promises[3]) {
    return next(new NotFoundError('Driver', 400));
  }

  const today = new Date();
  let trip = await Trip.create({
    ...req.body,
    createdByUserRole: req.user.role,
    refToCreatedBy: req.user.roleObject._id,
    tripScheduleTime: req.body.tripScheduleTime >= today ? req.body.tripScheduleTime : today,
    // status: req.body.tripScheduleTime && new Date(req.body.tripScheduleTime) > today ? tripStatuses.tripCreated : undefined   //btw its not working this line of code
    status: tripStatuses.tripCreated
  });

  trip = await Trip.findByIdAndUpdate(trip._id, {
    $push: {
      timeline: {
        userid: req.user._id,
        userrole: (req.user.role),
        event: ('Created'),
      },
    },
  });

  trip = await getTripById(trip._id);

  res.status(200).json(trip);//.end();

};

// GET /trip/trip_id
exports.getTrip = async (req, res, next) => {
  let trip = await getTripById(req.params.trip_id);

  if (!trip && req.user.role === 'Driver') trip = await Trip.findById(req.params.trip_id)
    .populate('dropoffAddress')
    .populate('pickupAddress')
    //.populate({ path: 'dropoffAddress', populate: { path: 'zone' } })
    //.populate({ path: 'pickupAddress', populate: { path: 'zone' } })
    .populate('customer')
    .populate('driver')
    .populate('tags')
    .populate('refToCreatedBy');

  if (!trip) return next(new NotFoundError('Trip'));
  console.log("req.user.roleObject._id.toString()......", req.user.roleObject._id.toString())
  console.log("trip.customer._id.toString()......", trip.customer._id.toString())
  if (req.user.role === 'Customer' && req.user.roleObject._id.toString() !== trip.customer._id.toString()) {
    return next(new ErrorResponse('You are not allowed to see this trip', 400));
  }
  if (req.user.role === 'Driver' && req.user.roleObject._id.toString() !== trip.driver._id.toString()) {
    return next(new ErrorResponse('You are not allowed to see this trip', 400));
    // let trips = Trips.filter(trip => req.user.roleObject._id.toString() === trip.driver._id.toString())
    // if (!trips) {
    //   return next(new NotFoundError('Trip'));
    // } else {
    //   trip = trips[0]
    // }
  }

  return res.status(200).json(trip);
};

// POST /trips/trip_id/dispatch
exports.dispatchTrip = async (req, res, next) => {
  const fields = checkFields(req.body, ['packageType',
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'pickupPhone',
    'dropoffPhone',
    'tripScheduleTime',
    'driver',
    'pickupNote',
    'dropoffNote',
    'customer',
    'numberOfPackages',
    'priority']);
  if (fields instanceof Error) return next(fields);

  let trip = await Trip.findById(req.params.trip_id);
  if (trip.status === 'dispatched/waiting-for-driver') {
    return next(new ErrorResponse('The trip has already been dispatched'));
  }
  const updateObj = {};
  let newTrip = await dispatch({ ...req.body }, req.user._id, trip, next, req.body.priority, updateObj);

  // if (newTrip.driver !== "") {
  //   newTrip.status === tripStatuses.driverAssigned
  // }
  res.status(200).json(newTrip).end();

};

// POST /trips/dispatch
exports.dispatchMultTrips = async (req, res, next) => {
  const errors = checkFields(req.body, ['trips', 'priority'], ['trips']);
  if (errors) return next(errors);

  let trips = await Trip.find({ _id: { $in: req.body.trips } })
    .populate('dropoffAddress')
    .populate('pickupAddress')
    .populate('customer')
    .populate('driver');
}

async function dispatch(body, user, trip, next, priority = 'normal', updateObj) {
  const requiredFieldsToDispatch = [
    'packageType',
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'pickupPhone',
    'dropoffPhone',
    'tripScheduleTime',
    'pickupNote',
    'dropoffNote',
    'customer',
    //'price',
    //'driver',
  ];
  for (let field of requiredFieldsToDispatch) {
    if (body[field] === undefined) {
      return next(new MissingRequiredError(field));
    }
  }
  const priorityy = trip.priority !== 'normal' ? { field: 'priority', value: priority } : {};
  let newTrip = await Trip.findByIdAndUpdate(
    trip._id,
    {
      status: 'dispatched/waiting-for-driver',
      priority: priority,
      dispatchTime: Date.now(),
      customerNotified: true,
    },
    { runValidators: true, new: true }
  );

  newTrip = await getTripById(newTrip._id);
  let array = [];
  await timeline({ ...body }, newTrip, array, updateObj);

  array.push(...[priorityy !== "" ? priorityy : {}, { field: 'status', value: tripStatuses['dispatched/waiting-for-driver'] }])
  if (array.length) {
    await Trip.findByIdAndUpdate(trip._id, {
      ...(Object.keys(updateObj).length > 0 ? { $set: updateObj } : {}),
      ...body,
      $push: {
        timeline: {
          userid: user._id,
          userrole: user.role,
          updates: array,
        },
      },
    });
  }
  return newTrip;
}

// GET /trips
exports.getTrips = async (req, res, next) => {

  const results = await Trip.find();
  return res.status(200).json(results);
};

// PUT /trip/trip_id
exports.updateTrip = async (req, res, next) => {
  let allowedFields = [
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'pickupNote',
    'dropoffNote',
    'pickupPhone',
    'dropoffPhone',
    'numberOfPackages',
    'tripScheduleTime',
    'note',
    //'customer',
    //'images',
    'packageType',
    'status',
    'paymentStatus',
    'priority',
    'dropoffType'
  ];
  if (req.user.role !== 'Dispatcher') {
    allowedFields.push(
      'driver',
      'price',
      'customer',
      //'tags'
    );
  }

  const fields = checkFields(req.body, allowedFields);
  if (fields instanceof Error) return next(fields);

  if ('status' in req.body && !allowedStatuses.includes(req.body.status))
    return next(new ErrorResponse('Invalid status'));

  if (req.user.role == 'Driver') {
    if ('status' in req.body && driverUnallowedStatuses.includes(req.body.status))
      return next(new ErrorResponse('Unallowed status', 401));
  }

  let trip = await Trip.findById(req.params.trip_id)
    .populate('driver')
    .populate('dropoffAddress')
    .populate('pickupAddress')

  if (trip.status == tripStatuses['droped-off'])
    return next(new ErrorResponse('Trip cannot be edited because it is already completed'));

  if (!trip) return next(new NotFoundError('Trip'));

  if (req.body.customer) {
    req.body.customer = req.user.role === 'Dispatcher' ? req.body.customer : trip.customer || req.user.roleObject._id;
  }

  let promises = await Promise.all([
    req.body.dropoffAddress ? CustomerAddress.find({ _id: { $in: req.body.dropoffAddress._id } }) : 1,
    req.body.pickupAddress ? CustomerAddress.find({ _id: req.body.pickupAddress }) : 1,
    req.body.customer ? Customer.findById(req.body.customer) : 1,
    req.body.driver ? Driver.findById(req.body.driver) : 1,
  ]);

  if (!promises[0] || !promises[1]) {
    return next(ErrorResponse('Address invalid', 400));
  }
  if (!promises[2]) {
    return next(ErrorResponse('Customer', 400));
  }
  if (!promises[3]) {
    return next(ErrorResponse('Driver', 400));
  }

  let newStatus = req.body.driver === null || req.body.status == tripStatuses.driverCancelled ? tripStatuses['dispatched/waiting-for-driver']
    : req.body.driver && req.body.driver !== trip.driver?._id.toString() ? tripStatuses.driverAssigned
      : req.body.driver && req.body.driver === trip.driver?._id.toString() ? tripStatuses.driverAssigned
        : req.body.status || trip.status;

  if (!trip.driver && !req.body.driver && req.body.status === tripStatuses.driverAssigned) {
    return next(new ErrorResponse("You need to add a driver", 400));
  }
  //since dispatch has to be triggered manually, let's set the status back to driver-assigned to make sure dispatch is triggered and new driver get's notified

  // const formattedDate = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }, { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', hour12: true }).replace(',', '');
  // console.log(formattedDate); // Output: 2023-06-05 3:05

  // const moment = require('moment');
  // const currentDate = new Date();
  // const utcDate = moment.utc(currentDate).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  // const formattedDate = moment.utc(utcDate).local().format('YYYY-MM-DD h:mm');

  // let completedTime = new Date(Date.now()).toString()
  // console.log(new Date(Date.now()).toISOString());

  let completedTime = (trip.status !== tripStatuses['droped-off'] && newStatus == tripStatuses['droped-off']) ? new Date(Date.now()).toISOString() : trip.completedTime || null;
  // if (req.body.tags)
  //   req.body.tags = await Tag.find({ _id: { $in: req.body.tags.map(t => t._id) } });

  await Trip.findByIdAndUpdate(
    req.params.trip_id,
    {
      ...req.body,
      status: newStatus,
      completedTime,
    },
    {
      runValidators: true,
    }
  );

  let array = [];
  const updateObj = {};
  await timeline({ ...req.body, status: newStatus }, trip, array, updateObj);

  if (array.length) {
    try {
      await Trip.updateOne(
        { _id: req.params.trip_id },
        {
          $push: {
            timeline: { userid: req.user._id, userRole: req.user.role, updates: array },
          },
          ...(Object.keys(updateObj).length > 0 ? { $set: updateObj } : {}),
        }
      );
      console.log('Trip updated successfully.');
    } catch (err) {
      console.log(err)
    }
  }
  trip = await getTripById(trip._id);

  res.status(200).json(trip).end();
};

// PUT /trips
exports.updateTrips = async (req, res, next) => {
  let allowedFields = [
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'pickupNote',
    'dropoffNote',
    'pickupPhone',
    'dropoffPhone',
    'numberOfPackages',
    'tripScheduleTime',
    'note',
    //'customer',
    //'images',
    'packageType',
    'status',
    'paymentStatus',
    'priority',
    'dropoffType'
  ];
  if (req.user.role !== 'Dispatcher') {
    allowedFields.push(
      'driver',
      'price',
      'customer',
      //'tags'
    );
  }
  // if (req.user.role === 'Dispatcher') {
  //   allowedFields.push('tags');
  // }
  const fields = checkFields(req.body.values, allowedFields);
  if (fields instanceof Error) return next(fields);
  if (req.user.role === 'Driver') {
    if (req.body.values.status) {
      /* check for valid req.body.values.status */
      if (driverUnallowedStatuses.includes(req.body.values.status))
        return next(new ErrorResponse("Unallowed status", 401))
    }
    /* check for valid driver - note will throw error if list includes admin-canceled trips */
    const unAllowedTrips = await Trip.find({ _id: { $in: req.body.trips }, driver: { $ne: req.user.refToRole } });
    if (unAllowedTrips.length > 0)
      return next(new ErrorResponse("Cannot post for another driver", 401));
  }

  if (req.body.values.tags)
    req.body.values.tags = await Tag.find({ _id: { $in: req.body.values.tags.map(t => t._id) } });

  let trips = await Trip.find({ _id: { $in: req.body.trips } })
    .populate('driver')
    .populate('dropoffAddress')
    .populate('pickupAddress')
    .populate('tags');
  await Trip.updateMany({ _id: { $in: req.body.trips } }, { ...req.body.values }, { runValidators: true, });

  for (let t of trips) {

    //since dispatch has to be triggered manually, let's set the status back to driver-assigned to make sure dispatch is triggered and new driver get's notified
    let newStatus = req.body.values.driver && req.body.values.driver !== t.driver?._id ? tripStatuses.driverAssigned
      : req.body.values.status == tripStatuses.driverCancelled ? tripStatuses.awaitingDriver
        : (req.body.values.status || t.status);
    let completedTime = (t.status !== tripStatuses.completed && newStatus == tripStatuses.completed) ? new Date() : t.completedTime || null;
    await Trip.findByIdAndUpdate(t._id, { status: newStatus, completedTime });

    let array = [];
    const updateObj = {};
    timeline({ ...req.body.values, status: newStatus }, t, array, updateObj);
    if (array.length) {
      await Trip.findByIdAndUpdate(t._id, {
        $push: {
          timeline: { userid: req.user._id, userrole: req.user.role, updates: array },
        },
        ...(Object.keys(updateObj).length > 0 ? { $set: updateObj } : {}),
      });
    }
  }

  trips = await Trip.find({ _id: { $in: req.body.trips } })
    .populate('dropoffAddress')
    .populate('pickupAddress')
    .populate('customer')
    .populate('driver')
    .populate('tags')
    .populate('refToCreatedBy');

  res.status(200).json(trips).end();
};

async function timeline(updates, trip, array, updateObj) {

  for (let [key, value] of Object.entries(updates)) {
    let temp = trip[key];

    if (temp instanceof Date) {
      value = new Date(value).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      temp = temp.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
    }

    if (typeof value === 'number' || typeof temp === 'number') {
      value = value.toString();
      temp = temp.toString();
    }
    // if (Array.isArray(value)) {
    //   value.forEach(v => {
    //     if (!temp.includes(v)) array.push({ field: key, value: v });
    //   })
    // }
    else {
      if ((temp?._id || temp) != (value?._id || value)) {
        // if (typeof value === 'object' && value) {
        //   value = value.label;
        // }
        array.push({ field: key, value: value });
      }
    }
    if (!trip[key]) {
      updateObj[key] = value;
      //updateObj.key = value;
    }
  }
}

// DELETE /trips/trip_id
exports.deleteTrip = async (req, res, next) => {
  const trip = await Trip.findById(req.params.trip_id);
  if (!trip) return next(new NotFoundError('Trip'));

  await Trip.deleteById(req.params.trip_id);

  res.status(200).json({ success: true }).end();
};

// DELETE /trips
exports.deleteMultTrips = async (req, res, next) => {
  //Need to check what will happen if one is there but not othere and give out what id is not there
  const trips = await Trip.find({ _id: { $in: req.body.trips } });
  if (!trips) return next(new NotFoundError('Trips'));

  await Trip.delete({ _id: { $in: req.body.trips } });

  res.status(200).json({ success: true }).end();
};

async function getTripById(id) {
  return Trip.findById(id)
    .populate('dropoffAddress')
    .populate('pickupAddress')
    //.populate({ path: 'dropoffAddress', populate: { path: 'zone' } })
    //.populate({ path: 'pickupAddress', populate: { path: 'zone' } })
    .populate('customer')
    .populate('driver')
    .populate('refToCreatedBy');
}
