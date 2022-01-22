function Config(structure) {
  const config = {};

  structure.forEach(structureItem => {
    const widthControl = new Control(parseInt(structureItem.properties.width));

    config[structureItem.key] = {
      width: widthControl
    };

    if (structureItem.group) {
      config[structureItem.key].group = new Config(structureItem.group);
    }
  });

  return config;
}

function Control(fixedWidth) {
  let internalValue = fixedWidth || 0;

  return {
    add: function (value) {
      if (!fixedWidth && value > internalValue) {
        internalValue = value;
      }
    },

    value: function () {
      return internalValue;
    }
  };
}

module.exports = { Config, Control };
