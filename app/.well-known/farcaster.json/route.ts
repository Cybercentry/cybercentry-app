import { withValidManifest } from "@coinbase/onchainkit/minikit";

const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEzMDIzOTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyODI2RWFlRmMzRmYzNzk0OTE1ODljNUJGNTNmMDI2MTk5ZEVDOUE0In0",
    payload: "eyJkb21haW4iOiJjeWJlcmNlbnRyeS1vbmUtbWluaS1hcHAudmVyY2VsLmFwcCJ9",
    signature: "MHhhMjI3YzU2MTM4NjJmMmQzODgyNzNjZGI0YTc0M2JhNDdhYzVkOTkxYmMyNjRkMjZlZTQ5OThhZGMwZTEyMzE0MzcwYTMzZTA3OGYzY2NiYzUwMDkzZDg5YWZiMzY1NTMzYjM0NWFkNWY3ODU4M2M1MmE3MGYyY2JkNTg0ODk3NTFi"
  }
};

export async function GET() {
  return Response.json(withValidManifest(minikitConfig));
}
