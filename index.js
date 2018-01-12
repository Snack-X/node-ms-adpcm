// MS-ADPCM decoder

const ADAPTATION_TABLE = [
  230, 230, 230, 230, 307, 409, 512, 614,
  768, 614, 512, 409, 307, 230, 230, 230,
];


function clamp(val, min, max) {
  if(val < min) return min;
  else if(val > max) return max;
  else return val;
}

function expandNibble(nibble, state, channel) {
  const signed = 8 <= nibble ? nibble - 16 : nibble;

  let predictor = ((
    state.sample1[channel] * state.coeff1[channel] +
    state.sample2[channel] * state.coeff2[channel]
  ) >> 8) + (signed * state.delta[channel]);

  predictor = clamp(predictor, -0x8000, 0x7fff);

  state.sample2[channel] = state.sample1[channel];
  state.sample1[channel] = predictor;

  state.delta[channel] = Math.floor(ADAPTATION_TABLE[nibble] * state.delta[channel] / 256);
  if(state.delta[channel] < 16) state.delta[channel] = 16;

  return predictor;
}

/**
 * Decode a block of MS-ADPCM data
 * @param  {Buffer}    buf           one block of MS-ADPCM data
 * @param  {number}    channels      number of channels (usually 1 or 2, never tested on upper values)
 * @param  {number[]}  coefficient1  array of 7 UInt8 coefficient values
 *                                   usually, [ 256, 512, 0, 192, 240, 460, 392 ]
 * @param  {number[]}  coefficient2  array of 7 UInt8 coefficient values
 *                                   usually, [ 0, -256, 0, 64, 0, -208, -232 ]
 * @return {Buffer[]}                array of decoded PCM buffer for each channels
 */
function decode(buf, channels, coefficient1, coefficient2) {
  const state = {
    coefficient: [ coefficient1, coefficient2 ],
    coeff1: [],
    coeff2: [],
    delta: [],
    sample1: [],
    sample2: [],
  };

  let offset = 0;

  // Read MS-ADPCM header
  for(let i = 0 ; i < channels ; i++) {
    const predictor = clamp(buf.readUInt8(offset), 0, 6);
    offset += 1;

    state.coeff1[i] = state.coefficient[0][predictor];
    state.coeff2[i] = state.coefficient[1][predictor];
  }

  for(let i = 0 ; i < channels ; i++) { state.delta.push(buf.readInt16LE(offset)); offset += 2; }
  for(let i = 0 ; i < channels ; i++) { state.sample1.push(buf.readInt16LE(offset)); offset += 2; }
  for(let i = 0 ; i < channels ; i++) { state.sample2.push(buf.readInt16LE(offset)); offset += 2; }

  // Decode
  const output = [];

  for(let i = 0 ; i < channels ; i++)
    output[i] = [ state.sample2[i], state.sample1[i] ];

  let channel = 0;
  while(offset < buf.length) {
    const byte = buf.readUInt8(offset);
    offset += 1;

    output[channel].push(expandNibble(byte >> 4, state, channel));
    channel = (channel + 1) % channels;

    output[channel].push(expandNibble(byte & 0xf, state, channel));
    channel = (channel + 1) % channels;
  }

  return output;
}

module.exports = decode;
