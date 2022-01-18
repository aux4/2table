function Config(structure) {
  const config = {};

  structure.forEach(structureItem => {
    const widthControl = new Control();

    config[structureItem.key] = {
      width: widthControl
    };

    if (structureItem.group) {
      config[structureItem.key].group = new Config(structureItem.group);
    }
  });

  return config;
}

function Control() {
  let internalValue = 0;

  return {
    add: function (value) {
      if (value > internalValue) {
        internalValue = value;
      }
    },

    value: function () {
      return internalValue;
    }
  };
}

module.exports = { Config, Control };
