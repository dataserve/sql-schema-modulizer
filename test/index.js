"use strict";

const SqlSchemaModulizer = require("../index");

describe("SqlSchemaModulizer Tests", function() {
    it("First test", function(done) {
        try {
            const modulizer = new SqlSchemaModulizer("../config/exampleBlog");
            
            done();
        } catch (err) {
            done(err);
        }
    });
});
