const {expect} = require('chai');

const {getPortNumber} = require('../src/get-port-number');

describe('getPortNumber', () => {
  it('should return undefined if text not match', () => {
    const result = getPortNumber('[pubsub] This is the Google Pub/Sub fake.');
    expect(result).to.be.equal(undefined);
  });

  it('should return with the port number if text INFO', () => {
    const result = getPortNumber('[pubsub] INFO: Server started, listening on 1234');
    expect(result).to.be.equal('1234');
  });

  it('should return with the port number if text INFOS', () => {
    const result = getPortNumber('[pubsub] INFOS: Server started, listening on 12202');
    expect(result).to.be.equal('12202');
  });

});
