"use strict";

const { faker } = require("@faker-js/faker");
const { v4 } = require("uuid");
const fs = require("fs");
const path = require("path");
faker.locale = "pt_BR";

const max_items = 100;

const fixtureFile = path.normalize(
  path.join(__dirname, "../", "migrations", "pacientes-seed.json")
);

const callback = (err) => {
  if (err) throw err;

  console.log(`Seed generated in "${fixtureFile}"`);
};

let pacientes = [];

for (let i = 0; i < max_items; i++) {
  const data = {
    paciente_id: v4(),
    name: faker.name.firstName(),
    email: faker.internet.email(),
    telefone: faker.phone.phoneNumber("###########"),
    data_nascimento: faker.date.between("1940-01-01", "2021-12-31"),
    status: true,
  };
  pacientes.push(data);
}

fs.writeFileSync(fixtureFile, JSON.stringify(pacientes), callback);
