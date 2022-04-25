// const { streams } = require("../../utils/streams");

describe("kato stream update", () => {
  it("refresh stream", () => {
    cy.task("log", "ENVIRONMENT: " + process.env.NODE_ENV);
    cy.visit(
      "https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fartists.spotify.com%2Fc%2Fartist%2F3yTNaLgtCufxUYDsWa5MpA%2Faudience%2Fstats"
    );
    cy.get("#login-username")
      .type("damiflo94@gmail.com")
      .should("have.value", "damiflo94@gmail.com");
    cy.get("#login-password")
      .type("Drenathan1!")
      .should("have.value", "Drenathan1!");
    cy.contains("Log In").click();
    cy.get("body").then(($body) => {
      cy.get('*[class^="Popover-sc"]')
        .within(() => {
          cy.get("button").click();
        })
        .then(() => {
          /**
           *
           * // MAIN SCRIPT
           *
           */
          const countries = [];
          const results = {};
          cy.get("[data-testid='timeline-streams']").click();
          cy.wait(2000);
          cy.get(".spt-chart-a11y")
            .children()
            .each(($el, index) => {
              if (index !== 0) {
                const spend = $el.attr("aria-label");
                if (results.Worldwide) {
                  results.Worldwide.push(spend);
                } else {
                  results.Worldwide = [spend];
                }
              }
            })
            .then(() => cy.task("log", `progress added worldwide`));
          cy.contains("Worldwide").click();
          cy.get(".Overlay-u80gmt-0.cIdoSH")
            .within(() => {
              cy.get('[role="listbox"]')
                .children()
                .each(($el) => {
                  const country = $el.text();
                  if (country !== "Worldwide") {
                    countries.push(country);
                  }
                });
            })
            .then(() => {
              countries.forEach((country, index) => {
                // if (
                //   !["Guinea-Bissau", "Guyana", "United States"].includes(
                //     country
                //   )
                // )
                //   return;
                cy.contains(country).click();
                cy.wait(5000);
                cy.get("body").then(($body) => {
                  if ($body.find("[data-testid='timeline-streams']").length) {
                    cy.get("[data-testid='timeline-streams']").click({
                      force: true,
                    });
                    cy.wait(2000);
                    cy.get(".spt-chart-a11y")
                      .then(($chart) => {
                        if ($chart.length) {
                          cy.get(".spt-chart-a11y")
                            .children()
                            .each(($el, index) => {
                              if (index !== 0) {
                                const spend = $el.attr("aria-label");
                                if (results[country]) {
                                  results[country].push(spend);
                                } else {
                                  results[country] = [spend];
                                }
                              }
                            });
                        }
                      })

                      .then(() => {
                        cy.contains(country).click();
                        // console.log(results);
                        cy.task(
                          "log",
                          `PROGRESSSTART${index + 1}/${
                            countries.length
                          }/${country}PROGRESSEND `
                        );
                      });
                  } else {
                    cy.contains(country).click();
                  }
                });
              });
            })
            .then(() => {
              // console.log(results);
              const url =
                process.env.NODE_ENV === "production"
                  ? "https://tts-systems.de/api/v1/artists/kato/streams"
                  : "http://127.0.0.1:5000/api/v1/artists/kato/streams";

              cy.request("POST", url, { streams: results });
              //send report to server
            });
          /**
           *
           * // MAIN SCRIPT
           *
           */
        });
    });
  });
});
