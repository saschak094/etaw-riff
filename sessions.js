const sessions = {
  monday: ["lolo"],
  tuesday: ["lala"],
  wednesday: ["lele"]
};

module.exports = day => {
  return sessions[day][0];
};
