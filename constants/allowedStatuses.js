exports.allowedStatuses = [
  'tripCreated',
  'dispatched/waiting-for-driver',
  'driver-assigned',
  //'dispatched', 
  //'accepted', 
  'picked-up',
  'droped-off',
  //'completed', 
  'cancelled',
  //'admin-cancelled', 
  //'driver-cancelled', 
  //'customer-cancelled', 
  //'scheduled',
  'on-hold'
];

const tripStatuses = {
  'tripCreated': 'tripCreated',
  'dispatched/waiting-for-driver': 'dispatched/waiting-for-driver',
  'driverAssigned': 'driver-assigned',
  //'dispatched': 'dispatched',
  //'accepted': 'accepted',
  'pickedUp': 'picked-up',
  'droped-off': 'droped-off',
  //'completed': 'completed',
  'cancelled': 'cancelled',
  //'adminCancelled': 'admin-cancelled',
  //'driverCancelled': 'driver-cancelled',
  //'customerCancelled': 'customer-cancelled',
  //'scheduled': 'scheduled',
  'onHold': 'on-hold',
}
exports.tripStatuses = tripStatuses;

// what driver can receive in GET or socket
exports.driverAllowedStatuses = [
  tripStatuses.dispatched,
  tripStatuses.accepted,
  tripStatuses.pickedUp,
  tripStatuses.completed,
  tripStatuses.cancelled,
  tripStatuses.driverCancelled,
]
// what driver cannot post in update
exports.driverUnallowedStatuses = [
  // tripStatuses.dispatched, //driver can un-accept a trip
  tripStatuses.cancelled,
  tripStatuses.onHold,
  tripStatuses.scheduled,
  tripStatuses.awaitingDriver,
 // tripStatuses.driverAssigned,
]
// driver's "in progress" trips - where cancellations must be notified
exports.driverOpenStatuses = [
  tripStatuses.dispatched,
  tripStatuses.accepted,
  tripStatuses.pickedUp,
]