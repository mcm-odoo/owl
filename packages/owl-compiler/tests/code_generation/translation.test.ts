import { snapshotTemplate } from "../helpers";

describe("translation support", () => {
  test("can translate node content", () => {
    snapshotTemplate(`<div>word</div>`, {
      translateFn: (expr: string) => (expr === "word" ? "mot" : expr),
    });
  });

  test("does not translate node content if disabled", () => {
    snapshotTemplate(
      `
        <div>
          <span>word</span>
          <span t-translation="off">word</span>
        </div>
      `,
      { translateFn: (expr: string) => (expr === "word" ? "mot" : expr) }
    );
  });

  test("some attributes are translated", () => {
    snapshotTemplate(
      `
        <div>
          <p label="word">word</p>
          <p title="word">word</p>
          <p placeholder="word">word</p>
          <p alt="word">word</p>
          <p something="word">word</p>
        </div>
      `,
      { translateFn: (expr: string) => (expr === "word" ? "mot" : expr) }
    );
  });

  test("can set and remove translatable attributes", () => {
    snapshotTemplate(
      `
        <div tomato="word" potato="word" title="word" label="word">text</div>
      `,
      {
        translatableAttributes: ["potato", "-label"],
        translateFn: (expr: string) => (expr === "word" ? "mot" : expr),
      }
    );
  });

  test("translation is done on the trimmed text, with extra spaces readded after", () => {
    snapshotTemplate(
      `
        <div> word </div>
      `,
      { translateFn: (expr: string) => (expr === "word" ? "mot" : expr) }
    );
  });

  test("translation works, even if initial string has inner consecutive white space", () => {
    snapshotTemplate(`<div>some  word</div>`, {
      translateFn: (expr: string) => (expr === "some  word" ? "un mot" : expr),
    });
  });

  test("body of t-sets are translated", () => {
    snapshotTemplate(
      `
        <t t-set="label">untranslated</t>
        <t t-out="label"/>`,
      { translateFn: () => "translated" }
    );
  });

  test("body of t-sets inside translation=off are not translated", () => {
    snapshotTemplate(
      `
        <t t-translation="off">
          <t t-set="label">untranslated</t>
          <t t-out="label"/>
        </t>`,
      { translateFn: () => "translated" }
    );
  });

  test("body of t-sets inside translation=off are not translated 2", () => {
    snapshotTemplate(
      `
        <t>
          <t t-translation="off" t-set="label">untranslated</t>
          <t t-out="label"/>
        </t>`,
      { translateFn: () => "translated" }
    );
  });

  test("body of t-sets with html content are translated", () => {
    snapshotTemplate(
      `
        <t t-set="label"><div>untranslated</div></t>
        <t t-out="label"/>`,
      { translateFn: () => "translated" }
    );
  });

  test("body of t-sets with text and html content are translated", () => {
    snapshotTemplate(
      `
        <t t-set="label">
          some text
          <div>untranslated</div>
        </t>
        <t t-out="label"/>`,
      { translateFn: () => "translated" }
    );
  });

  test("t-set and falsy t-value: t-body are translated", () => {
    snapshotTemplate(
      `
          <t t-set="label" t-value="false">untranslated</t>
          <t t-out="label"/>`,
      { translateFn: () => "translated" }
    );
  });

  test("t-translation with several children", () => {
    snapshotTemplate(`
          <div>
            <t t-translation="off">
                <div/>
                <div/>
            </t>
            <t t-if="true"/>
        </div>
      `);
  });
});

describe("translation context", () => {
  test("translation of text in context", () => {
    snapshotTemplate(
      `
        <div>word</div>
        <div t-translation-context="fr">word</div>
      `,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "fr" ? (expr === "word" ? "mot" : expr) : expr,
      }
    );
  });

  test("translation of attributes in context", () => {
    snapshotTemplate(
      `
        <div t-translation-context="en" t-translation-context-title="fr" title="title" label="game"/>
      `,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "fr" ? (expr === "title" ? "titre" : expr) : expr,
      }
    );
  });

  test("body of t-sets are translated in context", () => {
    snapshotTemplate(
      `
        <t t-set="label" t-translation-context="fr">untranslated</t>
        <t t-out="label"/>`,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "fr" ? "traduit" : expr,
      }
    );
  });

  test("props with modifier .translate are translated in context", () => {
    snapshotTemplate(
      `
        <ChildComponent text.translate="game" t-translation-context-text.translate="fr" />`,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "fr" ? "jeu" : expr,
      }
    );
    snapshotTemplate(`<span t-out="this.props.text"/>`, {
      translateFn: (expr: string, translationCtx: string) =>
        translationCtx === "fr" ? "jeu" : expr,
    });
  });

  test("slot attrs and text contents are translated in context", () => {
    snapshotTemplate(
      `
        <ChildComponent t-translation-context="fr">
          <t t-set-slot="a" title.translate="title" t-translation-context-title.translate="pt">game</t>
        </ChildComponent>
        `,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "fr" ? "jeu" : translationCtx === "pt" ? "título" : expr,
      }
    );
    snapshotTemplate(
      `
        <div t-translation-context="ja">
          <t t-call-slot="a"/>
        </div>`,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "fr" ? "jeu" : translationCtx === "pt" ? "título" : expr,
      }
    );
  });

  test("default slot params and content translated in context", () => {
    snapshotTemplate(
      `
        <div>
          <t
            t-call-slot="default"
            t-translation-context="fr"
            param.translate="param"
            title.translate="title"
            t-translation-context-title.translate="pt"
          >
            foo
          </t>
        </div>`,
      {
        translateFn: (expr: string, translationCtx: string) =>
          translationCtx === "pt" ? "título" : expr,
      }
    );
  });

  test("t-translation-context with several children", () => {
    snapshotTemplate(`
          <div>
            <t t-translation-context="ctx">
                <div/>
                <div/>
            </t>
            <t t-if="true"/>
        </div>
      `);
  });
});
