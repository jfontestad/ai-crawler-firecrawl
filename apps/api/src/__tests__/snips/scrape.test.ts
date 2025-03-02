import { scrape } from "./lib";

describe("Scrape tests", () => {
  it.concurrent("mocking works properly", async () => {
    // depends on falsified mock mocking-works-properly
    // this test will fail if mock is bypassed with real data -- firecrawl.dev will never have
    // that as its actual markdown output

    const response = await scrape({
      url: "http://firecrawl.dev",
      useMock: "mocking-works-properly",
    });

    expect(response.markdown).toBe(
      "this is fake data coming from the mocking system!",
    );
  }, 30000);

  it.concurrent("works", async () => {
    const response = await scrape({
      url: "http://firecrawl.dev"
    });

    expect(response.markdown).toContain("Firecrawl");
  }, 30000);

  it.concurrent("handles non-UTF-8 encodings", async () => {
    const response = await scrape({
      url: "https://www.rtpro.yamaha.co.jp/RT/docs/misc/kanji-sjis.html",
    });

    expect(response.markdown).toContain("ぐ け げ こ ご さ ざ し じ す ず せ ぜ そ ぞ た");
  }, 30000);

  if (process.env.TEST_SUITE_SELF_HOSTED && process.env.PROXY_SERVER) {
    it.concurrent("self-hosted proxy works", async () => {
      const response = await scrape({
        url: "https://icanhazip.com"
      });

      expect(response.markdown?.trim()).toBe(process.env.PROXY_SERVER!.split("://").slice(-1)[0].split(":")[0]);
    }, 30000);
  }

  if (!process.env.TEST_SUITE_SELF_HOSTED || process.env.PLAYWRIGHT_MICROSERVICE_URL) {
    it.concurrent("waitFor works", async () => {
      const response = await scrape({
        url: "http://firecrawl.dev",
        waitFor: 2000,
      });
  
      expect(response.markdown).toContain("Firecrawl");
    }, 30000);
  }

  describe("JSON scrape support", () => {
    it.concurrent("returns parseable JSON", async () => {
      const response = await scrape({
        url: "https://jsonplaceholder.typicode.com/todos/1",
        formats: ["rawHtml"],
      });

      const obj = JSON.parse(response.rawHtml!);
      expect(obj.id).toBe(1);
    }, 30000);
  });

  if (!process.env.TEST_SUITE_SELF_HOSTED) {
    describe("Ad blocking (f-e dependant)", () => {
      it.concurrent("blocks ads by default", async () => {
        const response = await scrape({
          url: "https://www.allrecipes.com/recipe/18185/yum/",
        });

        expect(response.markdown).not.toContain(".g.doubleclick.net/");
      }, 30000);

      it.concurrent("doesn't block ads if explicitly disabled", async () => {
        const response = await scrape({
          url: "https://www.allrecipes.com/recipe/18185/yum/",
          blockAds: false,
        });

        expect(response.markdown).toContain(".g.doubleclick.net/");
      }, 30000);
    });
  
    describe("Location API (f-e dependant)", () => {
      it.concurrent("works without specifying an explicit location", async () => {
        await scrape({
          url: "https://iplocation.com",
        });
      }, 30000);

      it.concurrent("works with country US", async () => {
        const response = await scrape({
          url: "https://iplocation.com",
          location: { country: "US" },
        });
    
        expect(response.markdown).toContain("| Country | United States |");
      }, 30000);
    });

    describe("Screenshot (f-e/sb dependant)", () => {
      it.concurrent("screenshot format works", async () => {
        const response = await scrape({
          url: "http://firecrawl.dev",
          formats: ["screenshot"]
        });
    
        expect(typeof response.screenshot).toBe("string");
      }, 30000);

      it.concurrent("screenshot@fullPage format works", async () => {
        const response = await scrape({
          url: "http://firecrawl.dev",
          formats: ["screenshot@fullPage"]
        });
    
        expect(typeof response.screenshot).toBe("string");
      }, 30000);
    });
  
    describe("Proxy API (f-e dependant)", () => {
      it.concurrent("undefined works", async () => {
        await scrape({
          url: "http://firecrawl.dev",
        });
      }, 30000);

      it.concurrent("basic works", async () => {
        await scrape({
          url: "http://firecrawl.dev",
          proxy: "basic",
        });
      }, 30000);

      it.concurrent("stealth works", async () => {
        await scrape({
          url: "http://firecrawl.dev",
          proxy: "stealth",
        });
      }, 30000);
    });
    
    describe("PDF (f-e dependant)", () => {
      it.concurrent("works for PDFs behind anti-bot", async () => {
        const response = await scrape({
          url: "https://www.researchgate.net/profile/Amir-Leshem/publication/220732050_Robust_adaptive_beamforming_based_on_jointly_estimating_covariance_matrix_and_steering_vector/links/0c96052d2fd8f0a84b000000/Robust-adaptive-beamforming-based-on-jointly-estimating-covariance-matrix-and-steering-vector.pdf"
        });

        expect(response.markdown).toContain("Robust adaptive beamforming based on jointly estimating covariance matrix");
      }, 60000);
    });
  }

  if (!process.env.TEST_SUITE_SELF_HOSTED || process.env.OPENAI_API_KEY || process.env.OLLAMA_BASE_URL) {
    describe("JSON format", () => {
      it.concurrent("works", async () => {
        const response = await scrape({
          url: "http://firecrawl.dev",
          formats: ["json"],
          jsonOptions: {
            prompt: "Based on the information on the page, find what the company's mission is and whether it supports SSO, and whether it is open source.",
            schema: {
              type: "object",
              properties: {
                company_mission: {
                  type: "string",
                },
                supports_sso: {
                  type: "boolean",
                },
                is_open_source: {
                  type: "boolean",
                },
              },
              required: ["company_mission", "supports_sso", "is_open_source"],
            },
          },
        });
    
        expect(response).toHaveProperty("json");
        expect(response.json).toHaveProperty("company_mission");
        expect(typeof response.json.company_mission).toBe("string");
        expect(response.json).toHaveProperty("supports_sso");
        expect(response.json.supports_sso).toBe(false);
        expect(typeof response.json.supports_sso).toBe("boolean");
        expect(response.json).toHaveProperty("is_open_source");
        expect(response.json.is_open_source).toBe(true);
        expect(typeof response.json.is_open_source).toBe("boolean");
      }, 30000);
    });
  }
});
