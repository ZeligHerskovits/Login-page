module.exports = function fullName() {
    let name = '';
    if (this.firstName) {
      name = `${this.firstName} `;
    }
    if (this.lastName) {
      name += this.lastName;
    }
    return name;
  };
  