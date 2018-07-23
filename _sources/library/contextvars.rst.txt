:mod:`contextvars` --- Context Variables
========================================

.. module:: contextvars
   :synopsis: Context Variables

.. sectionauthor:: Yury Selivanov <yury@magic.io>

--------------

This module provides APIs to manage, store, and access context-local
state.  The :class:`~contextvars.ContextVar` class is used to declare
and work with *Context Variables*.  The :func:`~contextvars.copy_context`
function and the :class:`~contextvars.Context` class should be used to
manage the current context in asynchronous frameworks.

Context managers that have state should use Context Variables
instead of :func:`threading.local()` to prevent their state from
bleeding to other code unexpectedly, when used in concurrent code.

See also :pep:`567` for additional details.

.. versionadded:: 3.7


Context Variables
-----------------

.. class:: ContextVar(name, [\*, default])

   This class is used to declare a new Context Variable, e.g.::

       var: ContextVar[int] = ContextVar('var', default=42)

   The required *name* parameter is used for introspection and debug
   purposes.

   The optional keyword-only *default* parameter is returned by
   :meth:`ContextVar.get` when no value for the variable is found
   in the current context.

   **Important:** Context Variables should be created at the top module
   level and never in closures.  :class:`Context` objects hold strong
   references to context variables which prevents context variables
   from being properly garbage collected.

   .. attribute:: ContextVar.name

      The name of the variable.  This is a read-only property.

      .. versionadded:: 3.7.1

   .. method:: get([default])

      Return a value for the context variable for the current context.

      If there is no value for the variable in the current context,
      the method will:

      * return the value of the *default* argument of the method,
        if provided; or

      * return the default value for the context variable,
        if it was created with one; or

      * raise a :exc:`LookupError`.

   .. method:: set(value)

      Call to set a new value for the context variable in the current
      context.

      The required *value* argument is the new value for the context
      variable.

      Returns a :class:`~contextvars.Token` object that can be used
      to restore the variable to its previous value via the
      :meth:`ContextVar.reset` method.

   .. method:: reset(token)

      Reset the context variable to the value it had before the
      :meth:`ContextVar.set` that created the *token* was used.

      For example::

          var = ContextVar('var')

          token = var.set('new value')
          # 'var'를 사용하는 코드; var.get() 은 'new value'를 반환합니다.
          var.reset(token)

          # reset 호출 후에 var에는 값이 다시 없으므로, var.get() 은
          # LookupError를 발생시킵니다.


.. class:: contextvars.Token

   *Token* objects are returned by the :meth:`ContextVar.set` method.
   They can be passed to the :meth:`ContextVar.reset` method to revert
   the value of the variable to what it was before the corresponding
   *set*.

   .. attribute:: Token.var

      A read-only property.  Points to the :class:`ContextVar` object
      that created the token.

   .. attribute:: Token.old_value

      A read-only property.  Set to the value the variable had before
      the :meth:`ContextVar.set` method call that created the token.
      It points to :attr:`Token.MISSING` is the variable was not set
      before the call.

   .. attribute:: Token.MISSING

      A marker object used by :attr:`Token.old_value`.


Manual Context Management
-------------------------

.. function:: copy_context()

   Returns a copy of the current :class:`~contextvars.Context` object.

   The following snippet gets a copy of the current context and prints
   all variables and their values that are set in it::

      ctx: Context = copy_context()
      print(list(ctx.items()))

   The function has an O(1) complexity, i.e. works equally fast for
   contexts with a few context variables and for contexts that have
   a lot of them.


.. class:: Context()

   A mapping of :class:`ContextVars <ContextVar>` to their values.

   ``Context()`` creates an empty context with no values in it.
   To get a copy of the current context use the
   :func:`~contextvars.copy_context` function.

   Context implements the :class:`collections.abc.Mapping` interface.

   .. method:: run(callable, \*args, \*\*kwargs)

      Execute ``callable(*args, **kwargs)`` code in the context object
      the *run* method is called on.  Return the result of the execution
      or propagate an exception if one occurred.

      Any changes to any context variables that *callable* makes will
      be contained in the context object::

        var = ContextVar('var')
        var.set('spam')

        def main():
            # 'var' 는 'copy_context()' 와 'ctx.run(main)' 을
            # 호출하기 전에 'spam' 으로 설정되었습니다. 그래서:
            # var.get() == ctx[var] == 'spam'

            var.set('ham')

            # 이제, 'var' 를 'ham' 으로 설정한 후에:
            # var.get() == ctx[var] == 'ham'

        ctx = copy_context()

        # 'main' 함수가 'var' 에 적용한 모든 변경은 'ctx' 에 포함됩니다.
        ctx.run(main)

        # 'main()' 함수는 'ctx' 컨텍스트에서 실행되었으므로,
        # 'var' 에 대한 변경은 'ctx' 에 포함되어 있습니다:
        # ctx[var] == 'ham'

        # 그러나, 'ctx' 외부에서, 'var' 는 여전히 'spam' 으로 설정되어있습니다:
        # var.get() == 'spam'

      The method raises a :exc:`RuntimeError` when called on the same
      context object from more than one OS thread, or when called
      recursively.

   .. method:: copy()

      Return a shallow copy of the context object.

   .. describe:: var in context

      Return ``True`` if the *context* has a value for *var* set;
      return ``False`` otherwise.

   .. describe:: context[var]

      Return the value of the *var* :class:`ContextVar` variable.
      If the variable is not set in the context object, a
      :exc:`KeyError` is raised.

   .. method:: get(var, [default])

      Return the value for *var* if *var* has the value in the context
      object.  Return *default* otherwise.  If *default* is not given,
      return ``None``.

   .. describe:: iter(context)

      Return an iterator over the variables stored in the context
      object.

   .. describe:: len(proxy)

      Return the number of variables set in the context object.

   .. method:: keys()

      Return a list of all variables in the context object.

   .. method:: values()

      Return a list of all variables' values in the context object.


   .. method:: items()

      Return a list of 2-tuples containing all variables and their
      values in the context object.


asyncio support
---------------

Context variables are natively supported in :mod:`asyncio` and are
ready to be used without any extra configuration.  For example, here
is a simple echo server, that uses a context variable to make the
address of a remote client available in the Task that handles that
client::

    import asyncio
    import contextvars

    client_addr_var = contextvars.ContextVar('client_addr')

    def render_goodbye():
        # 현재 처리중인 클라이언트의 주소를 이 함수에 명시 적으로 전달하지 않고도
        # 액세스 할 수 있습니다.

        client_addr = client_addr_var.get()
        return f'Good bye, client @ {client_addr}\n'.encode()

    async def handle_request(reader, writer):
        addr = writer.transport.get_extra_info('socket').getpeername()
        client_addr_var.set(addr)

        # 우리가 호출하는 모든 코드에서 이제 'client_addr_var.get()' 을
        # 호출하여 클라이언트의 주소를 가져올 수 있습니다.

        while True:
            line = await reader.readline()
            print(line)
            if not line.strip():
                break
            writer.write(line)

        writer.write(render_goodbye())
        writer.close()

    async def main():
        srv = await asyncio.start_server(
            handle_request, '127.0.0.1', 8081)

        async with srv:
            await srv.serve_forever()

    asyncio.run(main())

    # 테스트하려면 텔넷을 사용할 수 있습니다:
    #     telnet 127.0.0.1 8081
