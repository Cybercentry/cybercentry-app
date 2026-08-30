// React Testing Library only auto-registers its cleanup when vitest globals are
// on. They are off here, so unmount between tests explicitly — otherwise each
// render stacks in the same document and getByText finds duplicates.
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(cleanup)
