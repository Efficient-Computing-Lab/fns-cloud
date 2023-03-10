#!/bin/sh
mongoimport --db diabetes_web --collection energy --file /mongo_exports/energy.json
mongoimport --db diabetes_web --collection meal_plans --file /mongo_exports/meal_plans.json

