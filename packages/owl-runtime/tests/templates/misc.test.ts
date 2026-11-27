import { renderToString, snapshotEverything, TestContext, trim } from "../helpers";

snapshotEverything();

// -----------------------------------------------------------------------------
// misc
// -----------------------------------------------------------------------------

describe("misc", () => {
  test("global", () => {
    const context = new TestContext();
    const _calleeAsc = `<año t-att-falló="'agüero'" t-out="0"/>`;
    const _calleeUsesFoo = `<span t-out="foo">foo default</span>`;
    const _calleeAscToto = `<div t-out="toto">toto default</div>`;
    const caller = `
        <div>
          <t t-foreach="[4,5,6]" t-as="value" t-key="value">
            <span t-out="value"/>
            <t t-call="_callee-asc">
              <t t-call="_callee-uses-foo" foo="'aaa'">
              </t>
              <t t-call="_callee-uses-foo"/>
              <t t-set="foo" t-value="'bbb'"/>
              <t t-call="_callee-uses-foo"/>
            </t>
          </t>
          <t t-call="_callee-asc-toto"/>
        </div>`;
    context.addTemplate("_callee-asc", _calleeAsc);
    context.addTemplate("_callee-uses-foo", _calleeUsesFoo);
    context.addTemplate("_callee-asc-toto", _calleeAscToto);
    context.addTemplate("caller", caller);

    const result = trim(context.renderToString("caller"));
    const expected = trim(`
        <div>
          <span>4</span>
          <año falló="agüero">
            <span>aaa</span>
            <span>foo default</span>
            <span>bbb</span>
          </año>
  
          <span>5</span>
          <año falló="agüero">
            <span>aaa</span>
            <span>foo default</span>
            <span>bbb</span>
          </año>
  
          <span>6</span>
          <año falló="agüero">
            <span>aaa</span>
            <span>foo default</span>
            <span>bbb</span>
          </año>
  
          <div>toto default</div>
        </div>
      `);
    expect(result).toBe(expected);
  });

  test("complex template", () => {
    const template = `
      <div t-attf-class="batch_tile {{options.more? 'more' : 'nomore'}}">
        <div t-attf-class="card bg-{{klass}}-light">
          <div class="batch_header">
              <a t-attf-href="/runbot/batch/{{batch.id}}" t-attf-class="badge badge-{{batch.has_warning ? 'warning' : 'light'}}" title="View Batch">
                  <t t-out="batch.formated_age"/>
                  <i class="fa fa-exclamation-triangle" t-if="batch.has_warning"/>
                  <i class="arrow fa fa-window-maximize"/>
              </a>
          </div>
          <t t-if="batch.state=='preparing'">
              <span><i class="fa fa-cog fa-spin fa-fw"/> preparing</span>
          </t>
          <div class="batch_slots">
              <t t-foreach="batch.slot_ids.filter(slot => slot.build_id.id and !slot.trigger_id.manual and (options.trigger_display[slot.trigger_id.id]))" t-as="slot" t-key="slot.id">
                  <SlotButton class="slot_container" slot="slot"/>
              </t>
              <div class="slot_filler" t-foreach="[1, 2, 3, 4]" t-as="x" t-key="x"/>
          </div>
          <div class="batch_commits">
              <div t-foreach="commit_links" t-as="commit_link" class="one_line" t-key="commit_link.id">
                  <a t-attf-href="/runbot/commit/{{commit_link.commit_id}}" t-attf-class="badge badge-light batch_commit match_type_{{commit_link.match_type}}">
                  <i class="fa fa-fw fa-hashtag" t-if="commit_link.match_type == 'new'" title="This commit is a new head"/>
                  <i class="fa fa-fw fa-link" t-if="commit_link.match_type == 'head'" title="This commit is an existing head from bundle branches"/>
                  <i class="fa fa-fw fa-code-fork" t-if="commit_link.match_type == 'base_match'" title="This commit is matched from a base batch with matching merge_base"/>
                  <i class="fa fa-fw fa-clock-o" t-if="commit_link.match_type == 'base_head'" title="This commit is the head of a base branch"/>
                  <t t-out="commit_link.commit_dname"/>
                  </a>
                  <a t-att-href="'https://%s/commit/%s' % (commit_link.commit_remote_url, commit_link.commit_name)" class="badge badge-light" title="View Commit on Github"><i class="fa fa-github"/></a>
                  <span t-out="commit_link.commit_subject"/>
              </div>
          </div>
        </div>
      </div>`;

    const context = {
      options: { more: true },
      klass: "info",
      batch: {
        id: 3,
        has_warning: true,
        formated_age: "1 year",
        state: "preparing",
        slot_ids: [],
      },
      commit_links: [],
    };
    const expected = `<div class=\"batch_tile more\"><div class=\"card bg-info-light\"><div class=\"batch_header\"><a title=\"View Batch\" href=\"/runbot/batch/3\" class=\"badge badge-warning\">1 year<i class=\"fa fa-exclamation-triangle\"></i><i class=\"arrow fa fa-window-maximize\"></i></a></div><span><i class=\"fa fa-cog fa-spin fa-fw\"></i> preparing</span><div class=\"batch_slots\"><div class=\"slot_filler\"></div><div class=\"slot_filler\"></div><div class=\"slot_filler\"></div><div class=\"slot_filler\"></div></div><div class=\"batch_commits\"></div></div></div>`;
    expect(renderToString(template, context)).toBe(expected);
  });
});
