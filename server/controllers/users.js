const knex = require('../knex');
const _ = require('lodash');
const validator = require('validator');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const { handleError, INV_REQ } = require('./utilities');

const loginUser = async (req, res, next) => {
  try {
    const { handle, password } = req.body;
    if (!handle || !password) return handleError(res, next, INV_REQ);

    let user = await findUserByHandle(handle);
    if (!user)  return handleError(res, next, INV_REQ);

    let passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return handleError(res, next, INV_REQ);

    delete user.password;
    res.data = user;
    return next();
  } catch (err) {
    return handleError(res, next);
  }
};

const createUser = async(req, res, next) => {
  try {
    const { handle, name, email, avatar, password, bio, location, birthday } = req.body;
    if (!handle || !password || !name || !email || !validator.isEmail(email)) return handleError(res, next, INV_REQ);

    let dbUser = await Promise.all([findUserByEmail(email), findUserByHandle(handle)]);
    if (dbUser[0]) return handleError(res, next, 'Email is already in use.');
    if (dbUser[1]) return handleError(res, next, 'Handle is already in use.');

    let hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    if (!hashedPassword) return handleError(res, next, INV_REQ);

    let userInfo = {
        name,
        handle,
        email,
        password: hashedPassword,
        bio,
        location,
        birthday
    }
    if (avatar && validator.isBase64(avatar)) userInfo.avatar = avatar;

    let insertedUser = _.head(await knex('users').insert(userInfo).returning(['id', 'name', 'handle', 'email', 'avatar', 'bio', 'location', 'birthday']));
    res.data = insertedUser;
    return next();
  } catch (err) {
    return handleError(res, next);
  }
}

const findUserByEmail = async(email) => {
  return _.head(await knex('users').where('email', email));
}

const findUserByHandle = async(handle) => {
  return _.head(await knex('users').where('handle', handle));
}

module.exports = {
  loginUser,
  createUser,
  findUserByEmail,
  findUserByHandle
};
