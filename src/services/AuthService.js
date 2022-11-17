const bcrypt = require('bcryptjs');
const Jwt = require('jsonwebtoken');
const { config } = require('../config');
const { UserModel } = require('../models');
const { CustomError } = require('../helpers');

class AuthService {
  register = async (body) => {
    const user = await UserModel.findOne({ email: body.email });
    if (user) {
      throw new CustomError(`User with email: ${body.email} already exist.`, 400, 'Please login.');
    }

    const hashPassword = bcrypt.hashSync(body.password, 10);
    if (!hashPassword) {
      throw new CustomError('Unable to hash password.');
    }

    const newUser = await UserModel.create({ ...body, password: hashPassword });
    if (!newUser) {
      throw new CustomError('Unable to save User to DB.');
    }

    const token = this.generateToken(newUser._id);
    newUser.token = token;
    await newUser.save();

    newUser.password = '';
    return newUser;
  };

  login = async (email, password) => {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new CustomError(`User with email: ${email} not found.`, 400, 'Please provide valid email.');
    }

    const comparePassword = bcrypt.compareSync(password, user.password);
    if (!comparePassword) {
      throw new CustomError('Invalid password', 400, 'Please provide valid password.');
    }

    const token = this.generateToken(user._id);
    user.token = token;
    await user.save();

    if (!user.token) {
      throw new CustomError('Unable to save token.');
    }

    user.password = '';
    return user;
  };

  logout = async (id) => {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new CustomError(`Unable to logout.`, 400, 'Please try again.');
    }

    user.token = null;
    await user.save();

    if (user.token) {
      throw new CustomError(`Unable to update token in DB.`);
    }

    return true;
  };

  fogotPassword = async (email, password) => {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new CustomError(`Unable to find user.`, 400, 'Please try again.');
    }
  };

  validateToken = async (id, token) => {
    const user = await UserModel.findById(id);
    if (user && user.token === token) {
      return true;
    }
    return false;
  };

  generateToken = (id) => {
    const payload = { id };
    return Jwt.sign(payload, config.token.secret, { expiresIn: '8h' });
  };
}

module.exports = new AuthService();
