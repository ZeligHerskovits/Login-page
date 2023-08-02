const Zone = require('../models/Zone');
const { checkFields } = require('../middleware/checkFields');
const { ErrorResponse } = require('../utils/errors');
const CustomerAddress = require('../models/CustomerAddress');

exports.getZones = async (req, res) => {

  const results = await Zone.find();
  return res.status(200).json(results);
};

exports.addZone = async (req, res, next) => {
  let allowedFields = [
    'name',
    'color',
    'zipCodes'
  ];

  const fields = checkFields(req.body, allowedFields);
  if (fields instanceof Error) return next(fields);

  error = await checkZone(req.body);
  if (error) return next(error);

  let zone = await Zone.create({ name: req.body.name, color: req.body.color, zipCodes: req.body.zipCodes },)

  await CustomerAddress.updateMany({ 'location.zipCode': { $in: req.body.zipCodes } }, { $set: { zone: zone._id } })

  res.status(200).json(zone);
};

exports.editZone = async (req, res, next) => {
  let allowedFields = [
    'name',
    'color',
    'zipCodes'
  ];

  const fields = checkFields(req.body, allowedFields);
  if (fields instanceof Error) return next(fields);

  let error = await checkZone(req.body, req.params.zone_id);
  if (error) return next(error);

  let zone = await Zone.findById(req.params.zone_id);

  let deletedZipcodes = zone.zipCodes.filter(z => !req.body.zipCodes.includes(z));
  let addedZipcodes = req.body.zipCodes.filter(z => !zone.zipCodes.includes(z));

  zone = await Zone.findByIdAndUpdate(req.params.zone_id, { name: req.body.name, color: req.body.color, zipCodes: req.body.zipCodes },
    { runValidators: true, new: true });

  await CustomerAddress.updateMany({ 'location.zipCode': { $in: deletedZipcodes } }, { $unset: { zone: zone._id } });
  await CustomerAddress.updateMany({ 'location.zipCode': { $in: addedZipcodes } }, { zone: zone._id });

  res.status(200).json(zone);
};

exports.deleteZone = async (req, res) => {
  await Zone.findByIdAndDelete(req.params.zone_id);
  return res.status(200).end();
};

async function checkZone(body, zone_id = null) {

  if (!/^#[0-9A-F]{6}$/i.test(body.color)) {
    return new ErrorResponse('Please enter a valid hex code for the color field');
  }

  if (body.zipCodes.length > 12) {
    return new ErrorResponse('You can only add up to 12 zip codes in a zone');
  }
  const zones = await Zone.find({ _id: { $ne: zone_id } });

  for (let value of zones) {
    for (let i = 0; i < body.zipCodes.length; i++) {
      let temp = value.zipCodes.includes(body.zipCodes[i]);
      if (temp) {
        return new ErrorResponse(`Zipcode ${body.zipCodes[i]} already exists in another zone`);
      }
    }
  }
}