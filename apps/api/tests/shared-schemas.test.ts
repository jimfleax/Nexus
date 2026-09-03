import { describe, it, expect } from "vitest";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateKnowledgeListSchema,
  UpdateKnowledgeListSchema,
  ReorderKnowledgeListSchema,
  CreateResourceSchema,
  UpdateResourceSchema,
  UpdateUserSettingsSchema,
} from "@nexus/shared";

describe("Shared Zod Schemas", () => {
  describe("project.ts", () => {
    describe("CreateProjectSchema", () => {
      it("validates minimal valid shape", () => {
        const res = CreateProjectSchema.safeParse({ name: "Proj" });
        expect(res.success).toBe(true);
      });

      it("rejects empty name (min 1)", () => {
        const res = CreateProjectSchema.safeParse({ name: "" });
        expect(res.success).toBe(false);
      });

      it("rejects name too long (max 100)", () => {
        const res = CreateProjectSchema.safeParse({ name: "x".repeat(101) });
        expect(res.success).toBe(false);
      });

      it("accepts untrimmed name (does not trim since no .trim() in schema)", () => {
        const res = CreateProjectSchema.safeParse({ name: "  Proj" });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.name).toBe("  Proj");
        }
      });

      it("makes description optional", () => {
        const res = CreateProjectSchema.safeParse({ name: "P" });
        expect(res.success).toBe(true);
        if (res.success) expect(res.data.description).toBeUndefined();
      });

      it("rejects description too long (max 500)", () => {
        const res = CreateProjectSchema.safeParse({
          name: "P",
          description: "x".repeat(501),
        });
        expect(res.success).toBe(false);
      });

      it("strips unknown keys by default", () => {
        const res = CreateProjectSchema.safeParse({ name: "P", bogus: 1 });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data).not.toHaveProperty("bogus");
        }
      });
    });

    describe("UpdateProjectSchema", () => {
      it("validates full patch", () => {
        expect(
          UpdateProjectSchema.safeParse({ name: "P2", description: "D2" })
            .success,
        ).toBe(true);
      });

      it("validates empty body", () => {
        expect(UpdateProjectSchema.safeParse({}).success).toBe(true);
      });

      it("rejects empty name", () => {
        expect(UpdateProjectSchema.safeParse({ name: "" }).success).toBe(false);
      });

      it("validates partial payload", () => {
        const res = UpdateProjectSchema.safeParse({ description: "D3" });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.description).toBe("D3");
          expect(res.data).not.toHaveProperty("name");
        }
      });
    });
  });

  describe("knowledge-list.ts", () => {
    describe("ReorderKnowledgeListSchema", () => {
      it("validates valid array", () => {
        expect(
          ReorderKnowledgeListSchema.safeParse({
            items: [{ id: "1", position: 0 }],
          }).success,
        ).toBe(true);
      });

      it("validates empty items array", () => {
        expect(
          ReorderKnowledgeListSchema.safeParse({ items: [] }).success,
        ).toBe(true);
      });

      it("rejects missing id in item", () => {
        expect(
          ReorderKnowledgeListSchema.safeParse({ items: [{ position: 0 }] })
            .success,
        ).toBe(false);
      });

      it("rejects non-string id", () => {
        expect(
          ReorderKnowledgeListSchema.safeParse({
            items: [{ id: 1, position: 0 }],
          }).success,
        ).toBe(false);
      });

      it("accepts negative and float positions (schema uses plain z.number())", () => {
        expect(
          ReorderKnowledgeListSchema.safeParse({
            items: [{ id: "1", position: -5.5 }],
          }).success,
        ).toBe(true);
      });
    });

    describe("CreateKnowledgeListSchema", () => {
      it("validates valid input", () => {
        expect(
          CreateKnowledgeListSchema.safeParse({ projectId: "1", name: "L" })
            .success,
        ).toBe(true);
      });

      it("rejects empty name", () => {
        expect(
          CreateKnowledgeListSchema.safeParse({ projectId: "1", name: "" })
            .success,
        ).toBe(false);
      });

      it("rejects name too long", () => {
        expect(
          CreateKnowledgeListSchema.safeParse({
            projectId: "1",
            name: "x".repeat(101),
          }).success,
        ).toBe(false);
      });
    });

    describe("UpdateKnowledgeListSchema", () => {
      it("validates empty body", () => {
        expect(UpdateKnowledgeListSchema.safeParse({}).success).toBe(true);
      });
    });
  });

  describe("resource.ts", () => {
    describe("CreateResourceSchema", () => {
      it("validates valid url resource", () => {
        const res = CreateResourceSchema.safeParse({
          projectId: "p",
          listId: "l",
          title: "T",
          type: "url",
          url: "https://example.com",
        });
        expect(res.success).toBe(true);
      });

      it("validates valid file resource", () => {
        const res = CreateResourceSchema.safeParse({
          projectId: "p",
          listId: "l",
          title: "T",
          type: "pdf",
          mimeType: "application/pdf",
        });
        expect(res.success).toBe(true);
      });

      it("accepts missing discriminator fields (they are marked optional in schema)", () => {
        const res = CreateResourceSchema.safeParse({
          projectId: "p",
          listId: "l",
          title: "T",
          type: "url",
        });
        // The schema currently allows url to be optional even if type="url"
        expect(res.success).toBe(true);
      });

      it("rejects empty title", () => {
        expect(
          CreateResourceSchema.safeParse({
            projectId: "p",
            listId: "l",
            title: "",
            type: "text",
          }).success,
        ).toBe(false);
      });

      it("rejects unknown types", () => {
        expect(
          CreateResourceSchema.safeParse({
            projectId: "p",
            listId: "l",
            title: "T",
            type: "bogus",
          }).success,
        ).toBe(false);
      });
    });

    describe("UpdateResourceSchema", () => {
      it("validates empty body", () => {
        expect(UpdateResourceSchema.safeParse({}).success).toBe(true);
      });

      it("rejects empty title", () => {
        expect(UpdateResourceSchema.safeParse({ title: "" }).success).toBe(
          false,
        );
      });

      it("validates partial update", () => {
        expect(UpdateResourceSchema.safeParse({ title: "new" }).success).toBe(
          true,
        );
      });
    });
  });

  describe("user.ts", () => {
    describe("UpdateUserSettingsSchema", () => {
      it("validates empty body", () => {
        expect(UpdateUserSettingsSchema.safeParse({}).success).toBe(true);
      });

      it("validates driveRefreshToken", () => {
        expect(
          UpdateUserSettingsSchema.safeParse({ driveRefreshToken: "token" })
            .success,
        ).toBe(true);
        expect(
          UpdateUserSettingsSchema.safeParse({ driveRefreshToken: null })
            .success,
        ).toBe(true);
      });
    });
  });
});
