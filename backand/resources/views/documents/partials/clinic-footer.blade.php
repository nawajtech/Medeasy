<div class="doc-footer">
    @if(!empty($branding['footer_content'] ?? null))
        <div class="doc-footer__rich">{!! $branding['footer_content'] !!}</div>
    @endif
    @if(!empty($branding['invoice_footer'] ?? null))
        <p class="doc-footer__note"><strong>{{ $branding['invoice_footer'] }}</strong></p>
    @endif
    <p style="margin-top:8px;font-size:0.75rem;color:#94a3b8;">Generated {{ now()->format('M d, Y h:i A') }}</p>
</div>
