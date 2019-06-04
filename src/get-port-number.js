const getPortNumber = text => {
  const regExpResult = /\[pubsub\] INFOS?: Server started, listening on (\d*)/.exec(text);

  if(!regExpResult)
    return;

  return regExpResult[1].trim();
};

module.exports = {
  getPortNumber,
};
