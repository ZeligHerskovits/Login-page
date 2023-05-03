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
//const { allowedPriorities, tripPriorities } = require('../constants/constants');
//const buildAddress = require('../utils/buildAddress');
//const sendSMS = require('../utils/sendSMS');

// POST /trips
// Permissions: Dispatcher,Customer
// Creates New Trip
exports.createTrip = async (req, res, next) => {
  let allowedFields = [
    'pickupAddress', 'dropoffAddress', 'tripScheduleTime',
    'dispatchTime', 'completedTime', 'pickupName', 'dropoffName',
    'pickupPhone', 'dropoffPhone', 'pickoffNote', 'dropoffNote',
    'packageType', 'numberOfPackages', 'customer'
  ];
  // if (req.user.role === 'Dispatcher') {
  //   allowedFields.push(
  //     'priority', 'status', 'paymentStatus',
  //     'driver', 'price', 'customer'
  //   );
  // }
  const fields = checkFields(req.body, allowedFields);
  if (fields instanceof Error) return next(fields);

  //if (req.body.customer) {
  req.body.customer =
    req.user.role === 'Dispatcher' ? req.body.customer : req.user.roleObject._id;
  //}

  // let promise1 = new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve("Resolved After 100 ms");
  //   }, 100);
  // });
  // let promise2 = Promise.resolve("First rejected");
  // let promise3 = Promise.reject("Second rejected");

  // let retuendPromise = Promise.all([promise1, promise2, promise3]);
  // retuendPromise.then(values =>{
  //   console.log(values);
  // }).catch(e=>{
  //   console.log(e)
  // });

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
    status: req.body.tripScheduleTime && new Date(req.body.tripScheduleTime) > today ? 'scheduled' : undefined,
  });

  trip = await Trip.findByIdAndUpdate(trip._id, {
    $push: {
      timeline: {
        userid: req.user._id,
        userrole: (req.user.email === 'Login@gmail.com' ? 'Dispatcher' : req.user.role),
        event: ('Created'),
      },
    },
  });

  //trip = await getTripById(trip._id);

  res.status(200).json(trip).end();
  // if (req.user.email === 'website@errands.nyc' && trip.customer) {
  //   if (trip.customer?.email) {
  //     sendEmail({
  //       to: trip.customer.email,
  //       subject: 'Errands - Order Received',
  //       text: tripCustomerMessageFactory(trip),
  //     });
  //   } else if (trip.customer?.phoneNumber) {
  //     try {
  //       //try to send to regular phone if no mobile on file
  //       await sendSMS(trip.customer.phoneNumber, tripCustomerMessageFactory(trip));
  //     } catch (error) { }
  //   }
  //   Trip.findByIdAndUpdate(trip._id, { customerNotified: true });
  // }
  // if (trip.pickupAddress && trip.dropoffAddress && trip.customer)
  //   sendEmail({
  //     to: process.env.ADMIN_EMAIL,
  //     subject:
  //       'New Order from ' +
  //       (process.env.NODE_ENV === 'development' ? '(EVELT TEST)' : '') +
  //       (trip.customer?.phoneNumber || trip.customer.billingEmail) +
  //       ' OrderID ' +
  //       trip.orderNumber,
  //     text: tripCustomerMessageFactory(trip),
  //   });
};

// GET /trips/:trip_id
// Permissions: Dispatcher,Customer,Driver
// Get Trip By ID
exports.getTrip = async (req, res, next) => {
  let trip = await getTripById(req.params.trip_id);

  if (!trip && req.user.role === 'Driver') trip = await Trip.findById(req.params.trip_id)
    .populate('dropoffAddress')
    .populate('pickupAddress')
    //.populate({ path: 'dropoffAddress', populate: { path: 'zone' } })
    ////.populate({ path: 'pickupAddress', populate: { path: 'zone' } })
    .populate('customer')
    .populate('driver')
    .populate('tags')
    .populate('refToCreatedBy');

  if (!trip) return next(new NotFoundError('Trip'));

  if (req.user.role === 'Customer' && req.user.roleObject._id.toString() !== trip.customer._id.toString()) {
    return next(new ErrorResponse('You are not allowed to see this trip', 400));
    //return next(new NotFoundError('Trip'));
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

// POST /trips/:trip_id/dispatch
// Permissions: Dispatcher
// Send notification to driver
exports.dispatchTrip = async (req, res, next) => {
  const fields = checkFields(req.body, ['packageType',
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'pickupPhone',
    'dropoffPhone',
    'tripScheduleTime',
    'pickoffNote',
    'dropoffNote',
    'customer',
    'priority']);
  if (fields instanceof Error) return next(fields);

  let trip = await Trip.findById(req.params.trip_id);
  const newTrip = await dispatch(req.user._id, trip, next, req.body.priority);
  res.status(200).json(newTrip).end();

};

// POST /trips/dispatch
// Permissions: Dispatcher
// Send notification to driver
exports.dispatchMultTrips = async (req, res, next) => {
  const errors = checkFields(req.body, ['trips', 'priority'], ['trips']);
  if (errors) return next(errors);

  let trips = await Trip.find({ _id: { $in: req.body.trips } })
    .populate('dropoffAddress')
    .populate('pickupAddress')
    .populate('customer')
    .populate('driver');
  let newTrips = [];

  for (let trip of trips) {
    newTrips.push(await dispatch(req.user, trip, next, req.body.priority));
    driverNamespace.to(trip.driver._id.toString()).emit('trip:update', trip);
    if (trip.customer) customerNamespace.to(trip.customer._id.toString()).emit('trip:update', trip);
  }
  await sendNotification(newTrips.filter(newTrip => newTrip.driver.notificationOptIn));
  res.status(200).json(newTrips).end();
  dispatcherNamespace.emit('trip:update', newTrips);
};

async function dispatch(user, trip, next, priority = 'normal') {
  const requiredFieldsToDispatch = [
    'packageType',
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'pickupPhone',
    'dropoffPhone',
    'tripScheduleTime',
    'pickoffNote',
    'dropoffNote',
    'customer',
    'priority'
    //'price',
    //'driver',
  ];
  // for (let field of requiredFieldsToDispatch) {
  //   if (trip[field] === undefined) {
  //     return next(new MissingRequiredError(field));
  //   }
  // }

  // let notificationsToDriver;
  // if (trip.driver.smsOptIn || trip.driver.expoNotificationTokens.length == 0) {
  //   notificationsToDriver = await sendSMS(trip.driver.smsNumber, tripDriverMessageFactory(trip));
  // } else {
  //   notificationsToDriver = { message: 'Driver opted out of sms' };
  // }
  let newTrip = await Trip.findByIdAndUpdate(
    trip._id,
    {
      status: 'dispatched',
      priority: priority,
      dispatchTime: Date.now(),
      customerNotified: true,
      // notificationsToDriver: [
      //   notificationsToDriver,
      //   ...(trip.notificationsToDriver || []),
      // ],
    },
    { runValidators: true, new: true }
  );

  // notificationsToDriver.trip_id = trip._id;
  // dispatcherNamespace.emit('trip:notificationsToDriver', notificationsToDriver);
  newTrip = await getTripById(newTrip._id);

  let array = [{ field: 'priority', value: priority }, { field: 'status', value: tripStatuses.dispatched }];
  await Trip.findByIdAndUpdate(trip._id, {
    $push: {
      timeline: {
        userid: user._id,
        userrole: user.role,
        updates: array,
      },
    },
  });

  return newTrip;
}

// GET /trips
// Permissions: Dispatcher,Customer,Driver
// Get All Trip
exports.getTrips = async (req, res, next) => {
  const queries = {
    ...req.query,
  };
  let results;
  if (req.user.role === 'Customer') {
    queries.customer = req.user.roleObject._id;
  }
  if (req.user.role === 'Driver') {
    queries.driver = req.user.roleObject._id;
    results = await advancedQuery({ model: Trip, queries });
  } else {
    results = await advancedQuery({ model: Trip, queries });
  }

  return res.status(200).json(results);
};

// GET /trips/todaysTripsCSVjson2csv
// Permissions: Dispatcher,Customer,Driver
// Get All Trip
// // // exports.exportCSVOfTrips = asyncHandler(async (req, res, next) => {
// // //   const reg = /\d{1,2}\/\d{1,2}\/\d{4}/;
// // //   if (req.query.fromDate && !req.query.fromDate.match(reg)) {
// // //     return next(new ErrorResponse('fromDate format Should be mm/dd/yyyy'));
// // //   }

// // //   if (req.query.toDate && !req.query.toDate.match(reg)) {
// // //     return next(new ErrorResponse('toDate format Should be mm/dd/yyyy'));
// // //   }

// // //   let fromDate = new Date(
// // //     req.query.fromDate ?? new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
// // //   );
// // //   fromDate = new Date(fromDate.setHours(0, 0, 0, 0));

// // //   let toDate = new Date(
// // //     req.query.toDate ?? new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
// // //   );
// // //   toDate = new Date(toDate.setHours(0, 0, 0, 0));

// // //   if (fromDate > toDate) {
// // //     return next(new ErrorResponse('toDate should be after fromDate'));
// // //   }

// // //   const query = {
// // //     $or: [
// // //       {
// // //         $and: [
// // //           { completedTime: { $gte: fromDate } },
// // //           { completedTime: { $lte: toDate } }
// // //         ]
// // //       },
// // //       {
// // //         $and: [
// // //           { dispatchTime: { $gte: fromDate } },
// // //           { dispatchTime: { $lte: toDate } }
// // //         ]
// // //       }
// // //     ]
// // //   };

// // //   let results = await Trip.find(query)
// // //     .populate('dropoffAddress pickupAddress customer driver refToCreatedBy')
// // //     .lean();

// // //   // results = results.map((e) => flattenObject(e));

// // //   const fields = [
// // //     {
// // //       label: 'Customer',
// // //       value: (e) =>
// // //         e.customer?.companyName ||
// // //         (e.customer?.firstName || e.customer?.lastName
// // //           ? `${e.customer?.firstName || ''} ${e.customer?.lastName || ''}`
// // //           : e.customer?.billingEmail || e.customer?.phoneNumber),
// // //     },
// // //     {
// // //       label: 'Driver',
// // //       value: (e) =>
// // //         e.driver?.firstName || e.driver?.lastName
// // //           ? `${e.driver?.firstName || ''} ${e.driver?.lastName || ''}`
// // //           : e.driver?.smsNumber || e.driver?.email || '',
// // //     },
// // //     { label: 'Pickup Name', value: 'pickupName' },
// // //     {
// // //       label: 'Pickup Address',
// // //       value: (e) => e.pickupAddress?.location?.formattedAddress || e.pickupAddress?.location?.street || '',
// // //     },
// // //     { label: 'Pickup Line 2', value: 'pickupAddress.location.streetLine2' },
// // //     { Label: 'Pickup Phone', value: 'pickupPhone' },
// // //     { label: 'Delivery Name', value: 'dropoffName' },
// // //     {
// // //       label: 'Delivery Address',
// // //       value: (e) => e.dropoffAddress?.location?.formattedAddress || e.pickupAddress?.location?.street || '',
// // //     },
// // //     { label: 'Delivery Line 2', value: 'dropoffAddress.location.streetLine2' },
// // //     { label: 'Delivery Phone', value: 'dropoffPhone' },
// // //     {
// // //       label: 'Customer Phone',
// // //       value: (e) => e.customer?.phoneNumber || '',
// // //     },
// // //     { label: 'Note', value: 'note' },
// // //     { label: 'Package Type', value: 'packageType' },
// // //     { label: 'Price', value: 'price' },
// // //     {
// // //       label: 'DateTime',
// // //       value(r) {
// // //         return new Date(r.completedTime || r.dispatchTime).toLocaleString('en-US', { timeZone: 'America/New_York' });
// // //       },
// // //     },
// // //   ];

// // //   const csv = await parseAsync(results, { fields });
// // //   res.writeHead(200, {
// // //     'Content-Type': 'text/csv',
// // //     'Content-Disposition': `attachment; filename=${fromDate.toLocaleDateString()} Trips.csv`,
// // //   });
// // //   res.end(csv);
// // // });

// PUT /trips/:trip_id
// Permissions: Dispatcher, Driver, // not done work for Customer yet
// Updates Trip By ID
exports.updateTrip = async (req, res, next) => {
  let allowedFields = [
    'pickupAddress',
    'dropoffAddress',
    'pickupName',
    'dropoffName',
    'numberOfPackages',
    'dropoffNote',
    'pickupPhone',
    'dropoffPhone',
    'tripScheduleTime',
    'note',
    // 'customer',
    'images',
    'packageType',
    'status',
    'paymentStatus',
    'priority',
    'dropoffType'
  ];
  if (req.user.role === 'Dispatcher') {
    allowedFields.push(
      'driver',
      'price',
      'customer',
      'tags'
    );
  }

  const error = checkFields(req.body, allowedFields);
  if (error) return next(error);

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

  if (!trip) return next(new NotFoundError('Trip'));

  if (!trip.driver && !req.body.driver && req.body.status === tripStatuses.completed) {
    return next(new ErrorResponse("Can't complete without a driver", 400));
  }

  if (req.body.customer) {
    //customer can't update the customer on trip, or add something other then him
    req.body.customer = req.user.role === 'Dispatcher' ? req.body.customer : trip.customer || req.user.roleObject._id;
  }

  let promises = await Promise.all([
    req.body.dropoffAddress ? CustomerAddress.find({ _id: req.body.dropoffAddress }) : 1,
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
  await updateAsCanceled(trip, req.body, req.user);

  let newStatus = req.body.driver === null || req.body.status == tripStatuses.driverCancelled ? tripStatuses.awaitingDriver
    : req.body.driver && req.body.driver !== trip.driver?._id.toString() ? tripStatuses.driverAssigned
      : req.body.status || trip.status;
  //since dispatch has to be triggered manually, let's set the status back to driver-assigned to make sure dispatch is triggered and new driver get's notified

  let completedTime = (trip.status !== tripStatuses.completed && newStatus == tripStatuses.completed) ? new Date() : trip.completedTime || null;
  if (req.body.tags)
    req.body.tags = await Tag.find({ _id: { $in: req.body.tags.map(t => t._id) } });

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
  timeline({ ...req.body, status: newStatus }, trip, array);
  if (array) {
    trip = await Trip.findByIdAndUpdate(req.params.trip_id, {
      $push: {
        timeline: { userid: req.user._id, userrole: req.user.role, updates: array },
      },
    });
  }

  trip = await getTripById(trip._id);

  if (trip.customer) customerNamespace.to(trip.customer._id.toString()).emit('trip:update', trip);
  if (driverAllowedStatuses.includes(trip.status) && trip.driver) driverNamespace.to(trip.driver._id.toString()).emit('trip:update', trip);

  res.status(200).json(trip).end();

  if (cancelledStatuses.includes[req.body.status]) {
    let notificationsToDriver;
    if (trip.driver.smsOptIn || trip.driver.expoNotificationTokens.length == 0) {
      notificationsToDriver = await sendSMS(trip.driver.smsNumber, 'TRIP CANCELLED');
    } else {
      notificationsToDriver = { message: 'Driver opted out of sms' };
    }
    await Trip.findByIdAndUpdate(
      trip._id,
      {
        notificationsToDriver: [
          notificationsToDriver,
          ...(trip.notificationsToDriver || []),
        ],
      },
      { runValidators: true }
    );
    notificationsToDriver.trip_id = trip._id;
    dispatcherNamespace.emit(
      'trip:notificationsToDriver',
      notificationsToDriver
    );
  }
};

// PUT /trips
// Permissions: Dispatcher, Driver
// Updates Multiple Trips By ID
exports.updateTrips = async (req, res, next) => {
  let allowedFields = ['driver', 'status'];
  if (req.user.role === 'Dispatcher') {
    allowedFields.push('tags');
  }
  const error = checkFields(req.body.values, allowedFields);
  if (error) return next(error);
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
    await updateAsCanceled(t, req.body.values, req.user);
    console.log(req.body.values.status)

    //since dispatch has to be triggered manually, let's set the status back to driver-assigned to make sure dispatch is triggered and new driver get's notified
    let newStatus = req.body.values.driver && req.body.values.driver !== t.driver?._id ? tripStatuses.driverAssigned
      : req.body.values.status == tripStatuses.driverCancelled ? tripStatuses.awaitingDriver
        : (req.body.values.status || t.status);
    let completedTime = (t.status !== tripStatuses.completed && newStatus == tripStatuses.completed) ? new Date() : t.completedTime || null;
    await Trip.findByIdAndUpdate(t._id, { status: newStatus, completedTime });

    let array = [];
    timeline({ ...req.body.values, status: newStatus }, t, array);
    if (array.length) {
      await Trip.findByIdAndUpdate(t._id, {
        $push: {
          timeline: { userid: req.user._id, userrole: req.user.role, updates: array },
        },
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
  dispatcherNamespace.emit('trip:update', trips);
  for (let t of trips) {
    if (t.driver && driverAllowedStatuses.includes(t.status)) {
      driverNamespace.to(t.driver._id.toString()).emit('trip:update', t);
    }
    if (t.customer) customerNamespace.to(t.customer._id.toString()).emit('trip:update', t);
  }

  res.status(200).json(trips).end();
};

async function updateAsCanceled(trip, body, user) {
  async function notify(trip) {
    driverNamespace.to(trip.driver._id.toString()).emit('trip:update', trip);
    if (trip.driver.notificationOptIn)
      await sendNotification([trip], true);
    if (trip.driver.smsOptIn || trip.driver.expoNotificationTokens.length == 0)
      await sendSMS(trip.driver.smsNumber, tripDriverMessageFactory(trip, true));
  }

  if (user.role != "Driver" && cancelledStatuses.includes(body.status)) {
    await notify(trip);
  }
  else if (
    trip.driver?._id
    && body.driver
    && driverOpenStatuses.includes(trip.status)
    && body.driver !== trip.driver?._id
    && user.role === "Dispatcher"
  ) {
    //the previous driver needs to be notified
    /* make a copy so driver can see history */
    trip.status = tripStatuses.adminCancelled;
    trip.timeline.push({ userid: user._id, userrole: user.role, event: trip.status });
    delete trip._doc.__t;
    // console.log(trip)
    const newTrip = await StaleTrip.create({
      ...trip._doc,
      refToActive: trip._id,
      refToOrderNumber: trip.orderNumber,
      _id: mongoose.Types.ObjectId()
    });

    await notify(newTrip);
  }
}

function timeline(updates, trip, array) {
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

    if (Array.isArray(value)) {
      value.forEach(v => {
        if (!temp.includes(v)) array.push({ field: key, value: v.description + ' added' });
      })
    }
    else {
      if ((temp?._id || temp) != (value?._id || value)) {
        if (typeof value === 'object' && value) {
          value = value.label;
        }
        array.push({ field: key, value: value });
      }
    }
  }
}
// DELETE /trips/:trip_id
// Permissions: Dispatcher
// Deletes Trip By ID
exports.deleteTrip = async (req, res, next) => {
  const trip = await Trip.findById(req.params.trip_id);
  if (!trip) return next(new NotFoundError('Trip'));

  await Trip.deleteById(req.params.trip_id);
  // await updateAsCanceled(trip, { status: tripStatuses.cancelled }, req.user)

  res.status(200).json({ success: true }).end();
};

// DELETE /trips
// Permissions: Dispatcher
// Deletes multiple Trips By ID
exports.deleteMultTrips = async (req, res, next) => {
  const trips = await Trip.find({ _id: { $in: req.body.trips } });
  if (!trips) return next(new NotFoundError('Trips'));

  await Trip.delete({ _id: { $in: req.body.trips } });
  // for (let t of trips) await updateAsCanceled(t, { status: tripStatuses.cancelled }, req.user)

  res.status(200).json({ success: true }).end();
  dispatcherNamespace.emit('trip:deleted', { ids: req.body.trips });
  for (let trip of trips) {
    if (trip.customer) customerNamespace.to(trip.customer._id.toString()).emit('trip:deleted', trip._id);
  }
};

// GET /search/trips
// Permissions: Dispatcher
// Search All Trips
exports.searchTrips = async (req, res, next) => {
  const filter = url.parse(req.url, true).query.filter;
  const regexp = new RegExp(filter, 'i');
  // const queries = {
  //   ...req.query,
  // };
  // let trips = await advancedQuery({ model: Trip, queries });
  // trips = trips.filter(t => [
  //   t.orderNumber.toString(),
  //   t.customer?.fullName,
  //   t.pickupName,
  //   t.dropoffName,
  //   t.driver?.fullName,
  //   t.status,
  //   t.pickupAddress?.location.formattedAddress,
  //   t.dropoffAddress?.location.formattedAddress,
  //   t.packageType,
  //   t.note,
  // ]
  //   .some(s => regexp.test(s)))
  // console.log(trips.length)

  if (!filter) {
    const queries = {
      ...req.query,
    };
    const results = await advancedQuery({ model: Trip, queries });
    return res.status(200).json(results);
  }
  else {
    const trips = await Trip.aggregate([
      { $match: { deleted: false } },
      { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer' } },
      { $lookup: { from: 'drivers', localField: 'driver', foreignField: '_id', as: 'driver' } },
      { $lookup: { from: 'customeraddresses', localField: 'pickupAddress', foreignField: '_id', as: 'pickupAddress' } },
      { $lookup: { from: 'customeraddresses', localField: 'dropoffAddress', foreignField: '_id', as: 'dropoffAddress' } },
      { $unwind: '$customer' },
      // { $unwind: '$driver' },
      { $unwind: '$pickupAddress' },
      { $unwind: '$dropoffAddress' },
      {
        $match: {
          $expr: {
            $or: [
              { $regexMatch: { input: '$customer.firstName', regex: regexp } },
              { $regexMatch: { input: '$customer.lastName', regex: regexp } },
              // { $regexMatch: { input: '$driver.firstName', regex: regexp } },
              // { $regexMatch: { input: '$driver.lastName', regex: regexp } },
              { $eq: ['$status', filter] },
              { $regexMatch: { input: { $toString: '$orderNumber' }, regex: regexp } },
              { $regexMatch: { input: '$pickupName', regex: regexp } },
              { $regexMatch: { input: '$pickupPhone', regex: regexp } },
              { $regexMatch: { input: '$dropoffName', regex: regexp } },
              { $regexMatch: { input: '$dropoffPhone', regex: regexp } },
              { $regexMatch: { input: '$pickupAddress.location.formattedAddress', regex: regexp } },
              // { $regexMatch: { input: '$pickupAddress.location.street', regex: regexp } },
              { $regexMatch: { input: '$dropoffAddress.location.formattedAddress', regex: regexp } },
              // { $regexMatch: { input: '$dropoffAddress.location.street', regex: regexp } },
              // { $regexMatch: { input: '$packageType', regex: regexp } },
              // { $regexMatch: { input: '$note', regex: regexp } },
            ]
          }
        }
      },
      { $sort: { 'createdAt': -1 } }
    ]);

    console.log(trips.length)
    return res.status(200).json(trips);
  }
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

function tripDriverMessageFactory(trip, canceled = false) {
  const fromInfo = `${trip.pickupName} ${trip.pickupPhone}`;
  const toInfo = `${trip.dropoffName} ${trip.dropoffPhone}`;
  let pickupAddress = buildAddress(trip.pickupAddress);
  let dropoffAddress = buildAddress(trip.dropoffAddress);
  function customer() {
    return (
      trip.customer?.companyName ||
      (trip.customer?.firstName || trip.customer?.lastName
        ? `${trip.customer?.firstName || ''} ${trip.customer?.lastName || ''}`
        : '')
    );
  }

  let smsBody = '';
  if (canceled) {
    smsBody += ''
    smsBody += `🚫CANCELLED🚫 TRIP #${trip.orderNumber}:
    The following ${trip.priority === 'urgent' ? 'urgent' : ''} trip has been CANCELED by the ${trip.status == tripStatuses.customerCancelled ? 'costumer' : 'dispatcher'}`
  } else {
    if (trip.priority === 'urgent') {
      smsBody += `🚨 PRIORITY 🚨
        
        `;
    }
    smsBody += `NEW TRIP #${trip.orderNumber}:`
  }

  smsBody += ` 
Customer: ${customer()} 

Pickup Info: 
${fromInfo}
${pickupAddress}

Dropoff Info: 
${toInfo}
${dropoffAddress}

Package Type: 
${trip.numberOfPackages || 1} ${trip.packageType}`;

  if (trip.note || trip.dropoffNote) {
    smsBody += `

Note: `;

    if (trip.note) {
      smsBody += `
${trip.note}`;
    }
    if (trip.dropoffNote) {
      smsBody += `
${trip.dropoffNote}`;
    }
  }

  return smsBody;
}

function tripCustomerMessageFactory(trip) {
  const fromInfo = `${trip.pickupName} ${trip.pickupPhone}`;
  const toInfo = `${trip.dropoffName} ${trip.dropoffPhone}`;
  let pickupAddress = buildAddress(trip.pickupAddress);
  let dropoffAddress = buildAddress(trip.dropoffAddress);

  let smsBody = `Order Received: 

Pickup: 
${fromInfo}
${pickupAddress}

Delivery: 
${toInfo}
${dropoffAddress}

Package Type: ${trip.packageType}`;

  if (trip.note) {
    smsBody += `

Note: 
${trip.note}
`;
  }
  return smsBody;
}
